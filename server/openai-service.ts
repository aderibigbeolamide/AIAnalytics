import { Dot } from "lucide-react";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
}) : null;

interface EventValidateContext {
  userType: 'organization' | 'member' | 'guest' | 'general';
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentIntent?: 'registration' | 'validation' | 'tickets' | 'payment' | 'support' | 'general';
}

export class OpenAIService {
  
  static async generateChatbotResponse(
    userMessage: string, 
    context: EventValidateContext
  ): Promise<{ response: string; suggestedActions?: string[] }> {
    if (!openai) {
      return {
        response: "I apologize, but AI chat functionality is currently unavailable. Please contact our support team for assistance with your request.",
        suggestedActions: ["Contact Support", "Visit Help Center"]
      };
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...context.conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: "user" as const, content: userMessage }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        response: result.response || "I'm here to help! Could you provide more details about what you need assistance with?",
        suggestedActions: result.suggestedActions || []
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try asking your question in a different way, or contact our support team for immediate assistance.",
        suggestedActions: ["Contact Support", "Try Simple Question"]
      };
    }
  }

  static async enhanceEventRecommendations(
    userPreferences: any,
    availableEvents: any[]
  ): Promise<{ recommendations: any[]; reasoning: string }> {
    if (!openai) {
      return { 
        recommendations: availableEvents.map(event => ({ id: event.id, score: 0.5 })), 
        reasoning: "AI recommendations are currently unavailable. Showing all available events." 
      };
    }

    try {
      const prompt = `Based on user preferences and available events, provide personalized event recommendations.
      
      User Preferences: ${JSON.stringify(userPreferences)}
      Available Events: ${JSON.stringify(availableEvents)}
      
      Provide response in JSON format with:
      - recommendations: array of recommended event IDs with scores
      - reasoning: explanation of recommendation logic`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("OpenAI recommendations error:", error);
      return { recommendations: [], reasoning: "Unable to generate recommendations at this time." };
    }
  }

  static async generateEventDescription(eventData: any): Promise<string> {
    if (!openai) {
      return "Event description not available. AI description generation is currently unavailable.";
    }

    try {
      const prompt = `Create an engaging event description based on this event data: ${JSON.stringify(eventData)}
      
      Make it compelling and informative, highlighting key benefits and details. Keep it under 200 words.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });

      return response.choices[0].message.content || "Event description not available.";
    } catch (error) {
      console.error("OpenAI description error:", error);
      return "Event description not available.";
    }
  }

  private static buildSystemPrompt(context: EventValidateContext): string {
    return `You are an AI assistant for EventValidate, a comprehensive AI-powered member validation system. 

PLATFORM OVERVIEW:
EventValidate provides:
- Multi-tenant organization management
- Event creation and management  
- Member registration and validation
- QR code scanning and ticket systems
- Payment processing via Paystack
- Real-time notifications
- AI-powered seat availability heatmaps
- Personalized event recommendations

KEY FEATURES TO HELP USERS WITH:

1. ORGANIZATION REGISTRATION:
   - Organizations can register on the landing page
   - Super admin approval required
   - Bank account setup for payment processing
   - Multi-tenant isolation and privacy

2. EVENT MANAGEMENT:
   - Two event types: Registration events vs Ticket events
   - Registration events: CSV validation, face recognition, member verification
   - Ticket events: Simple purchase, transfer, QR validation
   - Payment integration with organization-specific routing

3. USER REGISTRATION & VALIDATION:
   - Public registration forms (members, guests, invitees)
   - QR code generation for validation
   - Multiple validation methods: QR scan, manual ID, face recognition
   - CSV-based member verification system

4. TICKET SYSTEM:
   - Ticket purchase with categories (Regular, VIP, etc.)
   - Ticket transfer and resale functionality
   - PDF ticket generation with QR codes
   - Payment processing and validation

5. PAYMENT PROCESSING:
   - Paystack integration with multi-tenant routing
   - Organization-specific bank accounts
   - Platform fee system (2% platform, 98% organizer)
   - Multiple payment methods support

6. AI FEATURES:
   - Real-time seat availability heatmaps
   - Personalized event recommendations
   - AI-powered customer support (you!)

CURRENT USER CONTEXT: ${context.userType}
CONVERSATION INTENT: ${context.currentIntent || 'general'}

INSTRUCTIONS:
- Be helpful, friendly, and informative
- Provide specific, actionable guidance
- Reference actual platform features accurately
- Suggest relevant next steps or actions
- If unsure, ask clarifying questions
- For complex issues, suggest contacting support
- Always respond in JSON format with "response" and optional "suggestedActions" array

RESPONSE FORMAT:
{
  "response": "Your helpful response here",
  "suggestedActions": ["Action 1", "Action 2"] // Optional array of suggested next steps
}`;
  }
}