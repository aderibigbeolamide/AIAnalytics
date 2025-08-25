import { 
  UserSearchHistory, 
  UserEventInteraction, 
  UserBehaviorPattern, 
  UserRecommendationFeedback,
  Event,
  EventRecommendation,
  InsertUserSearchHistory,
  InsertUserEventInteraction,
  InsertUserBehaviorPattern,
  InsertEventRecommendation
} from '@shared/schema';

/**
 * Intelligent Recommendation Service
 * Learns from user behavior to provide personalized event recommendations
 */
export class IntelligentRecommendationService {
  
  /**
   * Track user search behavior
   */
  static async trackSearch(data: {
    userId?: number;
    sessionId?: string;
    searchQuery: string;
    resultsCount: number;
    clickedEventId?: number;
    userAgent?: string;
    referrer?: string;
  }) {
    try {
      const now = new Date();
      const searchRecord: InsertUserSearchHistory = {
        userId: data.userId,
        sessionId: data.sessionId || this.generateSessionId(),
        searchQuery: data.searchQuery.toLowerCase().trim(),
        resultsCount: data.resultsCount,
        clickedEventId: data.clickedEventId,
        searchContext: {
          timeOfDay: this.getTimeOfDay(now),
          dayOfWeek: this.getDayOfWeek(now),
          userAgent: data.userAgent,
          referrer: data.referrer
        }
      };
      
      // In production, this would save to database
      console.log('Search tracked:', searchRecord);
      
      // Update user behavior patterns if user is logged in
      if (data.userId) {
        await this.updateUserBehaviorPatterns(data.userId, {
          searchKeyword: data.searchQuery,
          timeOfDay: this.getTimeOfDay(now)
        });
      }
      
      return searchRecord;
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  /**
   * Track user event interactions
   */
  static async trackEventInteraction(data: {
    userId?: number;
    sessionId?: string;
    eventId: number;
    interactionType: 'view' | 'click' | 'share' | 'bookmark' | 'register';
    timeSpent?: number;
    source?: 'search' | 'recommendation' | 'direct' | 'browse';
    searchQuery?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    scrollDepth?: number;
    clickPosition?: number;
  }) {
    try {
      const interaction: InsertUserEventInteraction = {
        userId: data.userId,
        sessionId: data.sessionId || this.generateSessionId(),
        eventId: data.eventId,
        interactionType: data.interactionType,
        timeSpent: data.timeSpent,
        source: data.source,
        deviceType: data.deviceType || 'desktop',
        interactionContext: {
          fromSearch: data.source === 'search',
          searchQuery: data.searchQuery,
          scrollDepth: data.scrollDepth,
          clickPosition: data.clickPosition
        }
      };
      
      console.log('Event interaction tracked:', interaction);
      
      // Update user behavior patterns
      if (data.userId) {
        await this.updateUserBehaviorPatterns(data.userId, {
          eventInteraction: data.interactionType,
          eventId: data.eventId
        });
      }
      
      return interaction;
    } catch (error) {
      console.error('Error tracking event interaction:', error);
    }
  }

  /**
   * Generate intelligent recommendations based on user behavior
   */
  static async generatePersonalizedRecommendations(userId: number, availableEvents: Event[]): Promise<EventRecommendation[]> {
    try {
      console.log(`Generating personalized recommendations for user ${userId}`);
      
      // Get user behavior patterns (mock for now)
      const userBehavior = await this.getUserBehaviorPatterns(userId);
      
      // Score events based on multiple factors
      const scoredEvents = availableEvents.map(event => {
        let score = 0;
        const reasons: string[] = [];
        
        // 1. Location preference (highest weight: 30%)
        if (userBehavior?.preferredLocations?.some(loc => 
          event.location?.toLowerCase().includes(loc.location.toLowerCase())
        )) {
          score += 30;
          reasons.push('Popular location for you');
        }
        
        // 2. Event type preference (25%)
        if (userBehavior?.preferredEventTypes?.some(type => 
          this.categorizeEvent(event).includes(type.type)
        )) {
          score += 25;
          reasons.push('Matches your interests');
        }
        
        // 3. Search history keywords (20%)
        const eventText = `${event.name} ${event.description}`.toLowerCase();
        const keywordMatches = userBehavior?.searchKeywords?.filter(keyword => 
          eventText.includes(keyword.keyword.toLowerCase())
        ) || [];
        
        if (keywordMatches.length > 0) {
          score += 20;
          reasons.push('Based on your search history');
        }
        
        // 4. Time preferences (15%)
        if (userBehavior?.preferredTimeSlots?.some(slot => 
          this.matchesTimeSlot(event, slot.timeSlot)
        )) {
          score += 15;
          reasons.push('Perfect timing for you');
        }
        
        // 5. Social preferences (10%)
        if (userBehavior?.personalityProfile) {
          const isGroupEvent = event.allowGuests || event.allowInvitees;
          if (userBehavior.personalityProfile.socialPreference > 70 && isGroupEvent) {
            score += 10;
            reasons.push('Great for social activities');
          } else if (userBehavior.personalityProfile.socialPreference < 30 && !isGroupEvent) {
            score += 10;
            reasons.push('Intimate event experience');
          }
        }
        
        // Bonus: Trending/popular events
        if (this.isPopularEvent(event)) {
          score += 5;
          reasons.push('Trending event');
        }
        
        // Penalty: Already registered events
        if (this.userAlreadyRegistered(userId, event.id!)) {
          score = Math.max(0, score - 50);
        }
        
        return {
          event,
          score: Math.min(100, score),
          reasons
        };
      });
      
      // Sort by score and return top recommendations
      const recommendations = scoredEvents
        .filter(item => item.score > 10) // Minimum relevance threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, 10) // Top 10 recommendations
        .map(item => ({
          userId,
          eventId: item.event.id!,
          score: item.score,
          reasons: item.reasons,
          status: 'pending' as const
        }));
      
      console.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
      return recommendations;
      
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Learn from user feedback and improve recommendations
   */
  static async processFeedback(feedback: {
    userId: number;
    eventId: number;
    feedbackType: 'like' | 'dislike' | 'not_interested' | 'registered';
    feedbackReason?: string;
  }) {
    try {
      console.log('Processing user feedback:', feedback);
      
      // Update user behavior patterns based on feedback
      await this.updateUserBehaviorPatterns(feedback.userId, {
        feedback: feedback
      });
      
      // Adjust future recommendation weights
      if (feedback.feedbackType === 'dislike' || feedback.feedbackType === 'not_interested') {
        await this.adjustRecommendationWeights(feedback.userId, feedback.eventId, 'negative');
      } else if (feedback.feedbackType === 'like' || feedback.feedbackType === 'registered') {
        await this.adjustRecommendationWeights(feedback.userId, feedback.eventId, 'positive');
      }
      
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  }

  /**
   * Get proactive recommendations for homepage
   */
  static async getProactiveRecommendations(userId: number, limit: number = 5): Promise<any[]> {
    try {
      // Get user's recent activity patterns
      const recentSearches = await this.getRecentSearchHistory(userId, 10);
      const recentInteractions = await this.getRecentInteractions(userId, 20);
      
      // Analyze patterns
      const patterns = this.analyzeUserPatterns(recentSearches, recentInteractions);
      
      // Generate contextual recommendations
      const recommendations = [
        ...this.getEventsByPattern(patterns.locationPattern, 'Events near you'),
        ...this.getEventsByPattern(patterns.timePattern, 'Perfect timing'),
        ...this.getEventsByPattern(patterns.interestPattern, 'Based on your interests'),
        ...this.getTrendingEvents('Trending now'),
        ...this.getUpcomingEvents('Coming soon')
      ].slice(0, limit);
      
      return recommendations;
      
    } catch (error) {
      console.error('Error getting proactive recommendations:', error);
      return [];
    }
  }

  // Helper Methods
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  private static getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private static categorizeEvent(event: Event): string[] {
    const categories: string[] = [];
    const eventText = `${event.name} ${event.description}`.toLowerCase();
    
    // Simple keyword-based categorization
    if (eventText.includes('music') || eventText.includes('concert')) categories.push('music');
    if (eventText.includes('tech') || eventText.includes('technology')) categories.push('technology');
    if (eventText.includes('food') || eventText.includes('dining')) categories.push('food');
    if (eventText.includes('sport') || eventText.includes('fitness')) categories.push('sports');
    if (eventText.includes('art') || eventText.includes('creative')) categories.push('arts');
    if (eventText.includes('business') || eventText.includes('professional')) categories.push('business');
    if (eventText.includes('education') || eventText.includes('learning')) categories.push('education');
    
    return categories.length > 0 ? categories : ['general'];
  }

  private static matchesTimeSlot(event: Event, timeSlot: string): boolean {
    if (!event.startDate) return false;
    
    const eventDate = new Date(event.startDate);
    const eventTimeOfDay = this.getTimeOfDay(eventDate);
    const eventDayOfWeek = this.getDayOfWeek(eventDate);
    
    return timeSlot.includes(eventTimeOfDay) || timeSlot.includes(eventDayOfWeek);
  }

  private static isPopularEvent(event: Event): boolean {
    // Mock popularity check - in production would check registration counts
    return Math.random() > 0.7;
  }

  private static userAlreadyRegistered(userId: number, eventId: number): boolean {
    // Mock check - in production would query database
    return false;
  }

  // Mock methods for behavior patterns (would use real database in production)
  private static async getUserBehaviorPatterns(userId: number): Promise<UserBehaviorPattern | null> {
    // Mock user behavior data
    return {
      id: 1,
      userId,
      patterns: {
        preferredEventTypes: [
          { type: 'technology', weight: 0.8 },
          { type: 'music', weight: 0.6 }
        ],
        preferredLocations: [
          { location: 'abuja', weight: 0.9 },
          { location: 'lagos', weight: 0.7 }
        ],
        preferredTimeSlots: [
          { timeSlot: 'evening_weekend', weight: 0.8 }
        ],
        searchKeywords: [
          { keyword: 'award', frequency: 5 },
          { keyword: 'tech', frequency: 3 }
        ],
        attendanceHistory: [],
        engagementScore: 75,
        personalityProfile: {
          explorationVsExploitation: 60,
          pricesensitivity: 40,
          socialPreference: 80,
          planningHorizon: 70
        }
      },
      lastUpdated: new Date(),
      createdAt: new Date()
    };
  }

  private static async updateUserBehaviorPatterns(userId: number, update: any): Promise<void> {
    console.log(`Updating behavior patterns for user ${userId}:`, update);
    // In production, would update database
  }

  private static async adjustRecommendationWeights(userId: number, eventId: number, type: 'positive' | 'negative'): Promise<void> {
    console.log(`Adjusting recommendation weights for user ${userId}, event ${eventId}: ${type}`);
    // In production, would adjust ML model weights
  }

  private static async getRecentSearchHistory(userId: number, limit: number): Promise<UserSearchHistory[]> {
    // Mock recent searches
    return [];
  }

  private static async getRecentInteractions(userId: number, limit: number): Promise<UserEventInteraction[]> {
    // Mock recent interactions
    return [];
  }

  private static analyzeUserPatterns(searches: UserSearchHistory[], interactions: UserEventInteraction[]): any {
    return {
      locationPattern: ['abuja', 'lagos'],
      timePattern: ['evening', 'weekend'],
      interestPattern: ['technology', 'music']
    };
  }

  private static getEventsByPattern(pattern: string[], reason: string): any[] {
    return []; // Mock recommendations
  }

  private static getTrendingEvents(reason: string): any[] {
    return []; // Mock trending events
  }

  private static getUpcomingEvents(reason: string): any[] {
    return []; // Mock upcoming events
  }
}