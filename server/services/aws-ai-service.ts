import { 
  ComprehendClient, 
  DetectSentimentCommand, 
  DetectKeyPhrasesCommand,
  DetectEntitiesCommand 
} from "@aws-sdk/client-comprehend";
import { 
  RekognitionClient, 
  DetectLabelsCommand, 
  DetectTextCommand,
  DetectModerationLabelsCommand 
} from "@aws-sdk/client-rekognition";

const comprehendClient = new ComprehendClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export class AWSAIService {
  /**
   * Analyze event description for sentiment, key phrases, and entities
   */
  static async analyzeEventText(text: string) {
    try {
      if (!text || text.length < 10) {
        return null;
      }

      const [sentimentResult, keyPhrasesResult, entitiesResult] = await Promise.all([
        comprehendClient.send(new DetectSentimentCommand({
          Text: text,
          LanguageCode: 'en'
        })),
        comprehendClient.send(new DetectKeyPhrasesCommand({
          Text: text,
          LanguageCode: 'en'
        })),
        comprehendClient.send(new DetectEntitiesCommand({
          Text: text,
          LanguageCode: 'en'
        }))
      ]);

      return {
        sentiment: {
          sentiment: sentimentResult.Sentiment,
          confidence: sentimentResult.SentimentScore,
          positiveScore: sentimentResult.SentimentScore?.Positive || 0,
          negativeScore: sentimentResult.SentimentScore?.Negative || 0,
          neutralScore: sentimentResult.SentimentScore?.Neutral || 0
        },
        keyPhrases: keyPhrasesResult.KeyPhrases?.map(phrase => ({
          text: phrase.Text,
          confidence: phrase.Score
        })) || [],
        entities: entitiesResult.Entities?.map(entity => ({
          text: entity.Text,
          type: entity.Type,
          confidence: entity.Score
        })) || []
      };
    } catch (error) {
      console.error('Error analyzing event text:', error);
      return null;
    }
  }

  /**
   * Analyze event image for labels, objects, and content
   */
  static async analyzeEventImage(imageUrl: string) {
    try {
      // Download image and convert to buffer
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const imageBuffer = await response.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);

      const [labelsResult, moderationResult] = await Promise.all([
        rekognitionClient.send(new DetectLabelsCommand({
          Image: { Bytes: imageBytes },
          MaxLabels: 10,
          MinConfidence: 70
        })),
        rekognitionClient.send(new DetectModerationLabelsCommand({
          Image: { Bytes: imageBytes },
          MinConfidence: 70
        }))
      ]);

      return {
        labels: labelsResult.Labels?.map(label => ({
          name: label.Name,
          confidence: label.Confidence,
          categories: label.Categories?.map(cat => cat.Name) || []
        })) || [],
        moderation: {
          isAppropriate: (moderationResult.ModerationLabels?.length || 0) === 0,
          flags: moderationResult.ModerationLabels?.map(label => ({
            name: label.Name,
            confidence: label.Confidence
          })) || []
        }
      };
    } catch (error) {
      console.error('Error analyzing event image:', error);
      return null;
    }
  }

  /**
   * Generate AI insights for an event
   */
  static async generateEventInsights(event: any) {
    try {
      const textAnalysis = await this.analyzeEventText(
        `${event.name}. ${event.description || ''} Location: ${event.location}`
      );
      
      let imageAnalysis = null;
      if (event.eventImage) {
        imageAnalysis = await this.analyzeEventImage(event.eventImage);
      }

      return {
        textAnalysis,
        imageAnalysis,
        aiTags: this.generateAITags(textAnalysis, imageAnalysis),
        vibeScore: this.calculateVibeScore(textAnalysis),
        recommendationReason: this.generateRecommendationReason(textAnalysis, imageAnalysis)
      };
    } catch (error) {
      console.error('Error generating event insights:', error);
      return null;
    }
  }

  /**
   * Generate smart tags based on AI analysis
   */
  private static generateAITags(textAnalysis: any, imageAnalysis: any): string[] {
    const tags: Set<string> = new Set();

    // From text analysis
    if (textAnalysis) {
      // Add sentiment-based tags
      if (textAnalysis.sentiment.positiveScore > 0.7) {
        tags.add('Uplifting');
      }
      if (textAnalysis.sentiment.positiveScore > 0.8) {
        tags.add('Feel-Good');
      }

      // Add key phrases as tags
      textAnalysis.keyPhrases
        .filter((phrase: any) => phrase.confidence > 0.8)
        .slice(0, 3)
        .forEach((phrase: any) => tags.add(phrase.text));

      // Add entity-based tags
      textAnalysis.entities
        .filter((entity: any) => entity.confidence > 0.8)
        .forEach((entity: any) => {
          if (entity.type === 'LOCATION') tags.add('Location-Based');
          if (entity.type === 'ORGANIZATION') tags.add('Professional');
          if (entity.type === 'PERSON') tags.add('Celebrity/Speaker');
        });
    }

    // From image analysis
    if (imageAnalysis) {
      imageAnalysis.labels
        .filter((label: any) => label.confidence > 80)
        .slice(0, 4)
        .forEach((label: any) => tags.add(label.name));
    }

    return Array.from(tags).slice(0, 6);
  }

  /**
   * Calculate a "vibe score" for the event
   */
  private static calculateVibeScore(textAnalysis: any): number {
    if (!textAnalysis) return 0.5;

    const positiveWeight = textAnalysis.sentiment.positiveScore * 0.6;
    const neutralWeight = textAnalysis.sentiment.neutralScore * 0.3;
    const keyPhraseBonus = textAnalysis.keyPhrases.length > 3 ? 0.1 : 0;

    return Math.min(1, positiveWeight + neutralWeight + keyPhraseBonus);
  }

  /**
   * Generate AI recommendation reason
   */
  private static generateRecommendationReason(textAnalysis: any, imageAnalysis: any): string {
    if (!textAnalysis) return "Interesting event worth checking out!";

    const sentiment = textAnalysis.sentiment.sentiment;
    const hasPositiveVibes = textAnalysis.sentiment.positiveScore > 0.6;
    const keyPhrases = textAnalysis.keyPhrases.slice(0, 2).map((p: any) => p.text);

    if (hasPositiveVibes && keyPhrases.length > 0) {
      return `Great vibes detected! Features ${keyPhrases.join(' and ')}.`;
    } else if (sentiment === 'POSITIVE') {
      return "Positive energy and engaging content expected.";
    } else if (sentiment === 'NEUTRAL' && keyPhrases.length > 0) {
      return `Well-organized event focusing on ${keyPhrases[0]}.`;
    } else {
      return "Unique event with interesting details to explore.";
    }
  }

  /**
   * Smart search using natural language understanding
   */
  static async enhancedSearch(query: string, events: any[]) {
    try {
      const queryAnalysis = await this.analyzeEventText(query);
      
      if (!queryAnalysis) {
        return events.filter(event => 
          event.name.toLowerCase().includes(query.toLowerCase()) ||
          event.description?.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Extract search intent from key phrases and entities
      const searchTerms = new Set<string>();
      
      queryAnalysis.keyPhrases.forEach((phrase: any) => {
        if (phrase.confidence > 0.7) {
          searchTerms.add(phrase.text.toLowerCase());
        }
      });

      queryAnalysis.entities.forEach((entity: any) => {
        if (entity.confidence > 0.7) {
          searchTerms.add(entity.text.toLowerCase());
        }
      });

      // Score events based on relevance
      const scoredEvents = events.map(event => {
        let score = 0;
        const eventText = `${event.name} ${event.description || ''} ${event.location}`.toLowerCase();
        
        searchTerms.forEach(term => {
          if (eventText.includes(term)) {
            score += 1;
          }
        });

        // Boost score for exact matches
        if (eventText.includes(query.toLowerCase())) {
          score += 2;
        }

        return { event, score };
      });

      return scoredEvents
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.event);
        
    } catch (error) {
      console.error('Error in enhanced search:', error);
      // Fallback to basic search
      return events.filter(event => 
        event.name.toLowerCase().includes(query.toLowerCase()) ||
        event.description?.toLowerCase().includes(query.toLowerCase())
      );
    }
  }
}