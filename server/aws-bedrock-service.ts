import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

interface EventValidateContext {
  userType: 'organization' | 'member' | 'guest' | 'general';
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentIntent?: 'registration' | 'validation' | 'tickets' | 'payment' | 'support' | 'general';
}

export class AWSBedrockService {
  private static client: BedrockRuntimeClient | null = null;

  private static getClient(): BedrockRuntimeClient | null {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log('⚠️  AWS Bedrock not configured - missing credentials');
      return null;
    }

    if (!this.client) {
      this.client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }

    return this.client;
  }

  static async generateChatbotResponse(
    userMessage: string,
    context: EventValidateContext
  ): Promise<{ response: string; suggestedActions?: string[] }> {
    const client = this.getClient();
    
    if (!client) {
      return {
        response: "I apologize, but AI chat functionality is currently unavailable. Please contact our support team for assistance with your request.",
        suggestedActions: ["Contact Support", "Visit Help Center"]
      };
    }

    try {
      const systemPrompt = this.buildEventValidateKnowledgeBase(context);
      const prompt = this.buildClaudePrompt(systemPrompt, userMessage, context.conversationHistory);

      const command = new InvokeModelCommand({
        modelId: "amazon.titan-text-express-v1",
        body: JSON.stringify({
          inputText: prompt,
          textGenerationConfig: {
            maxTokenCount: 500,
            temperature: 0.3,
            topP: 0.9
          }
        }),
        contentType: "application/json",
        accept: "application/json",
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      const aiResponse = responseBody.results[0]?.outputText || "I'm here to help with EventValidate questions. Could you please rephrase your question?";
      
      // Clean up the response and extract relevant parts
      const cleanResponse = aiResponse.replace(/^(Assistant:|Human:)?\s*/i, '').trim();
      
      return {
        response: cleanResponse,
        suggestedActions: this.getSuggestedActions(context.currentIntent)
      };

    } catch (error) {
      console.error("AWS Bedrock error:", error);
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try asking your question about EventValidate in a different way, or contact our support team for immediate assistance.",
        suggestedActions: ["Contact Support", "Try Simple Question"]
      };
    }
  }

  private static buildClaudePrompt(
    systemPrompt: string, 
    userMessage: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    let prompt = `Based on the EventValidate platform information provided, please answer this question: "${userMessage}"\n\n`;
    
    if (conversationHistory.length > 0) {
      prompt += "Previous conversation context:\n";
      conversationHistory.slice(-5).forEach((msg, index) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += "\n";
    }

    prompt += `IMPORTANT: Only answer questions about EventValidate platform features, services, and functionality. If the question is not related to EventValidate, politely redirect the user to ask about EventValidate features.

Please respond in JSON format:
{
  "response": "Your helpful response here",
  "suggestedActions": ["Action 1", "Action 2"]
}`;

    return prompt;
  }

  private static buildEventValidateKnowledgeBase(context: EventValidateContext): string {
    return `You are an AI assistant for EventValidate, a comprehensive AI-powered member validation system. You can ONLY answer questions about EventValidate platform features and services.

EVENTVALIDATE PLATFORM KNOWLEDGE BASE:

🏢 ORGANIZATION MANAGEMENT:
- Multi-tenant system with complete organization isolation
- Organizations register on landing page and wait for super admin approval
- Each organization has its own dashboard, events, and members
- Bank account setup required for payment processing via Paystack
- Organization verification system for enhanced credibility

🎫 EVENT MANAGEMENT (Two Types):
1. REGISTRATION EVENTS:
   - For member-based organizations (churches, clubs, associations)
   - CSV member validation system
   - Face recognition validation (AWS Rekognition)
   - QR code generation for each registrant
   - Manual ID validation as backup
   - Attendance tracking and reporting

2. TICKET EVENTS:
   - For general public events (concerts, conferences, workshops)
   - Multiple ticket categories (Regular, VIP, Premium)
   - Ticket purchase, transfer, and resale functionality
   - PDF ticket generation with QR codes
   - Real-time seat availability

💳 PAYMENT PROCESSING:
- Integrated Paystack payment gateway
- Organization-specific bank account routing
- Platform fee structure: 2% platform, 98% to organizer
- Support for multiple payment methods
- Automatic payment confirmations and receipts

📱 VALIDATION METHODS:
1. QR Code Scanning (Primary method)
2. Manual ID/Verification Code entry
3. Face Recognition (AI-powered via AWS)
4. CSV Member Verification

🤖 AI-POWERED FEATURES:
- Real-time seat availability heatmaps
- Personalized event recommendations
- AI customer support (this chatbot)
- Face recognition for secure event access
- Smart notification system

📊 ANALYTICS & REPORTING:
- Real-time attendance tracking
- Event performance metrics
- Financial reporting and analytics
- Member engagement insights
- Platform-wide statistics for super admins

🔔 NOTIFICATION SYSTEM:
- Real-time in-app notifications
- Email notifications for registrations and events
- SMS notifications (configurable)
- Admin alerts for escalated support requests

👥 USER ROLES:
- Super Admin: Platform oversight and organization approval
- Organization Admin: Event and member management
- Members: Event registration and participation
- Guests: Event registration without membership

COMMON USE CASES:
- Church events with member validation
- Corporate events with employee verification
- Conference registration and check-in
- Concert ticket sales and validation
- Workshop registration and attendance tracking

PRICING MODEL:
- Platform fee: 2% of all transactions
- Organizations keep 98% of payments
- Commission-based revenue growth potential up to 12%+

If asked about anything NOT related to EventValidate platform features, respond with: "I can only help with questions about EventValidate platform features and services. Please ask me about event management, member validation, payment processing, or any other EventValidate functionality."

Current user context: ${context.userType}
User intent: ${context.currentIntent || 'general'}`;
  }

  private static getSuggestedActions(intent?: string): string[] {
    const actionMap: Record<string, string[]> = {
      registration: ["View Registration Guide", "Start Registration", "Contact Support"],
      validation: ["Learn Validation Methods", "Test QR Scanner", "Setup Face Recognition"],
      tickets: ["Browse Events", "Buy Tickets", "Transfer Tickets"],
      payment: ["Setup Payment", "View Pricing", "Contact Billing"],
      support: ["Contact Support", "View Documentation", "Report Issue"],
      general: ["Explore Features", "View Pricing", "Register Organization"]
    };

    return actionMap[intent || 'general'] || actionMap.general;
  }

  static getStatus(): any {
    return {
      service: 'AWS Bedrock (Titan)',
      model: 'amazon.titan-text-express-v1',
      region: process.env.AWS_REGION || 'us-east-1',
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    };
  }
}