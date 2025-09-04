import { EventCleanupService } from './event-cleanup-service.js';
import { mongoStorage } from '../mongodb-storage.js';

export class CleanupScheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  
  /**
   * Start the cleanup scheduler - checks for cleanup candidates daily
   */
  static start() {
    // Run every 24 hours (86400000 ms)
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
    
    console.log('🗂️ Event cleanup scheduler started - checking daily for old events');
    
    // Run initial check after 1 minute
    setTimeout(() => {
      this.performCleanupCheck();
    }, 60000);
    
    // Then run daily
    this.intervalId = setInterval(() => {
      this.performCleanupCheck();
    }, CHECK_INTERVAL);
  }
  
  /**
   * Stop the cleanup scheduler
   */
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🗂️ Event cleanup scheduler stopped');
    }
  }
  
  /**
   * Perform cleanup check and send notifications to organizations
   */
  private static async performCleanupCheck() {
    try {
      console.log('🗂️ Running scheduled cleanup check...');
      
      const candidates = await EventCleanupService.findCleanupCandidates();
      
      if (candidates.length === 0) {
        console.log('🗂️ No events found for cleanup');
        return;
      }
      
      // Group candidates by organization
      const candidatesByOrg: Record<string, typeof candidates> = {};
      candidates.forEach(candidate => {
        if (!candidatesByOrg[candidate.organizationId]) {
          candidatesByOrg[candidate.organizationId] = [];
        }
        candidatesByOrg[candidate.organizationId].push(candidate);
      });
      
      // Send notifications to each organization
      for (const [orgId, orgCandidates] of Object.entries(candidatesByOrg)) {
        await this.notifyOrganizationOfCleanup(orgId, orgCandidates);
      }
      
      console.log(`🗂️ Cleanup check completed. Found ${candidates.length} candidates across ${Object.keys(candidatesByOrg).length} organizations`);
      
    } catch (error) {
      console.error('🗂️ Error during cleanup check:', error);
    }
  }
  
  /**
   * Send cleanup notification to organization
   */
  private static async notifyOrganizationOfCleanup(organizationId: string, candidates: any[]) {
    try {
      // Get organization details
      const organization = await mongoStorage.getOrganization(organizationId);
      if (!organization) {
        console.log(`Organization ${organizationId} not found`);
        return;
      }
      
      // Find organization admin to send notification to
      const orgUsers = await mongoStorage.getUsersByRole('admin');
      const orgAdmin = orgUsers.find(user => user.organizationId?.toString() === organizationId);
      
      if (orgAdmin) {
        // Create notification for the organization admin
        await mongoStorage.createNotification({
          recipientId: orgAdmin._id?.toString() || '',
          title: 'Event Cleanup Available',
          message: `You have ${candidates.length} old event(s) that ended more than 3 months ago. These can be safely deleted to free up database space. Visit Settings to review and delete them.`,
          type: 'info',
          priority: 'medium'
        });
      }
      
      console.log(`🗂️ Cleanup notification sent to organization: ${organization.businessName} (${candidates.length} candidates)`);
      
    } catch (error) {
      console.error(`Error notifying organization ${organizationId}:`, error);
    }
  }
  
  /**
   * Get cleanup statistics for monitoring
   */
  static async getCleanupStats() {
    try {
      const candidates = await EventCleanupService.findCleanupCandidates();
      
      const stats = {
        totalCandidates: candidates.length,
        oldestEventDays: candidates.length > 0 ? Math.max(...candidates.map(c => c.daysSinceEnded)) : 0,
        organizationsAffected: new Set(candidates.map(c => c.organizationId)).size,
        totalRegistrationsToCleanup: candidates.reduce((sum, c) => sum + c.totalRegistrations, 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        totalCandidates: 0,
        oldestEventDays: 0,
        organizationsAffected: 0,
        totalRegistrationsToCleanup: 0
      };
    }
  }
}