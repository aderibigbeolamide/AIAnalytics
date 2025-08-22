import type { Express, Request, Response } from "express";

export function setupChatbotTestRoutes(app: Express) {
  // Test endpoint to check AWS Bedrock status
  app.get("/api/chatbot/aws-status", async (req: Request, res: Response) => {
    try {
      const { AWSBedrockService } = await import('./aws-bedrock-service');
      const status = AWSBedrockService.getStatus();
      
      res.json({
        service: status,
        message: status.configured 
          ? "✅ AWS Bedrock configured and ready to use!"
          : "⚠️  AWS Bedrock credentials available but permissions may need verification",
        instructions: status.configured 
          ? "Your chatbot can now answer EventValidate-specific questions using Claude!"
          : "Add 'bedrock:InvokeModel' and 'bedrock:ListFoundationModels' permissions to your AWS user"
      });
    } catch (error) {
      console.error("AWS Bedrock status check error:", error);
      res.json({
        service: { configured: false, error: error.message },
        message: "❌ AWS Bedrock service unavailable",
        instructions: "Check your AWS credentials and permissions"
      });
    }
  });

  // Test endpoint for chatbot functionality
  app.post("/api/chatbot/test", async (req: Request, res: Response) => {
    const { message = "What is EventValidate and how does it work?" } = req.body;
    
    try {
      const { AWSBedrockService } = await import('./aws-bedrock-service');
      
      const context = {
        userType: 'general' as const,
        conversationHistory: [],
        currentIntent: 'general' as const
      };

      const response = await AWSBedrockService.generateChatbotResponse(message, context);
      
      res.json({
        status: "success",
        input: message,
        response: response.response,
        suggestedActions: response.suggestedActions,
        source: "aws_bedrock_test",
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.json({
        status: "error", 
        input: message,
        error: error.message,
        message: "AWS Bedrock permissions needed - add 'bedrock:InvokeModel' to your AWS user",
        timestamp: new Date().toISOString()
      });
    }
  });
}