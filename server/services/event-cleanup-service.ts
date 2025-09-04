import { mongoStorage } from '../mongodb-storage.js';

export interface CleanupCandidate {
  id: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  organizationId: string;
  daysSinceEnded: number;
  totalRegistrations: number;
}

export class EventCleanupService {
  /**
   * Find events that ended 3+ months ago and are candidates for cleanup
   */
  static async findCleanupCandidates(): Promise<CleanupCandidate[]> {
    try {
      const allEvents = await mongoStorage.getEvents();
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const candidates: CleanupCandidate[] = [];

      for (const event of allEvents) {
        const start = new Date(event.startDate);
        let end: Date;

        // Determine actual end date
        if (event.endDate) {
          end = new Date(event.endDate);
          // Set to end of day if no time specified
          if (end.getHours() === 0 && end.getMinutes() === 0) {
            end.setHours(23, 59, 59, 999);
          }
        } else {
          // Single day event - ends at end of start day
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
        }

        // Skip invalid dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

        // Skip if event hasn't ended yet
        if (end > now) continue;

        // Check if event ended 3+ months ago
        if (end < threeMonthsAgo) {
          // Get registration count for this event
          const registrations = await mongoStorage.getEventRegistrations(event._id?.toString() || '');
          
          const daysSinceEnded = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));

          candidates.push({
            id: event._id?.toString() || '',
            name: event.name,
            startDate: start,
            endDate: event.endDate ? end : undefined,
            organizationId: event.organizationId?.toString() || '',
            daysSinceEnded,
            totalRegistrations: registrations.length
          });
        }
      }

      return candidates.sort((a, b) => b.daysSinceEnded - a.daysSinceEnded);
    } catch (error) {
      console.error('Error finding cleanup candidates:', error);
      return [];
    }
  }

  /**
   * Get cleanup candidates for a specific organization
   */
  static async getOrganizationCleanupCandidates(organizationId: string): Promise<CleanupCandidate[]> {
    const allCandidates = await this.findCleanupCandidates();
    return allCandidates.filter(candidate => candidate.organizationId === organizationId);
  }

  /**
   * Delete an event and all associated data
   */
  static async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // Delete all registrations for this event
      const registrations = await mongoStorage.getEventRegistrations(eventId);
      for (const registration of registrations) {
        await mongoStorage.deleteEventRegistration(registration._id?.toString() || '');
      }

      // Delete all tickets for this event (if any)
      try {
        const tickets = await mongoStorage.getTickets({ eventId });
        for (const ticket of tickets) {
          await mongoStorage.deleteTicket(ticket.id);
        }
      } catch (error) {
        console.log('No tickets found for event or error deleting tickets:', error);
      }

      // Delete the event itself
      await mongoStorage.deleteEvent(eventId);

      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }
}