import express, { Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';
import { EventCleanupService } from '../services/event-cleanup-service.js';
import { mongoStorage } from '../mongodb-storage.js';

const router = express.Router();

// Get cleanup candidates for current organization
router.get('/cleanup-candidates', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId?.toString();
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }

    const candidates = await EventCleanupService.getOrganizationCleanupCandidates(organizationId);
    
    res.json({
      success: true,
      candidates,
      totalCandidates: candidates.length
    });
  } catch (error) {
    console.error('Error getting cleanup candidates:', error);
    res.status(500).json({ message: 'Failed to get cleanup candidates' });
  }
});

// Preview what will be deleted for an event
router.get('/preview-deletion/:eventId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const organizationId = req.user?.organizationId?.toString();

    // Get event details
    const event = await mongoStorage.getEvent(eventId);
    if (!event || event.organizationId?.toString() !== organizationId) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get associated data counts
    const registrations = await mongoStorage.getEventRegistrations(eventId);
    
    let tickets = [];
    try {
      tickets = await mongoStorage.getTickets({ eventId });
    } catch (error) {
      console.log('No tickets for this event');
    }

    res.json({
      success: true,
      event: {
        id: eventId,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate
      },
      dataToDelete: {
        registrations: registrations.length,
        tickets: tickets.length,
        totalRecords: registrations.length + tickets.length + 1 // +1 for the event itself
      }
    });
  } catch (error) {
    console.error('Error previewing deletion:', error);
    res.status(500).json({ message: 'Failed to preview deletion' });
  }
});

// Confirm and delete an event
router.delete('/delete-event/:eventId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { confirmed } = req.body;
    const organizationId = req.user?.organizationId?.toString();

    if (!confirmed) {
      return res.status(400).json({ message: 'Deletion must be confirmed' });
    }

    // Verify event belongs to this organization
    const event = await mongoStorage.getEvent(eventId);
    if (!event || event.organizationId?.toString() !== organizationId) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event qualifies for cleanup (ended 3+ months ago)
    const candidates = await EventCleanupService.getOrganizationCleanupCandidates(organizationId);
    const isCandidate = candidates.some(candidate => candidate.id === eventId);
    
    if (!isCandidate) {
      return res.status(400).json({ 
        message: 'Event does not qualify for cleanup. Only events ended 3+ months ago can be deleted.' 
      });
    }

    // Perform the deletion
    const success = await EventCleanupService.deleteEvent(eventId);
    
    if (success) {
      res.json({
        success: true,
        message: `Event "${event.name}" and all associated data have been deleted successfully.`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete event completely. Some data may remain.'
      });
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

export { router as cleanupRouter };