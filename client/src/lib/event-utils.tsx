/**
 * Utility functions for event handling
 */
import React from 'react';

// Default event avatars based on event type and theme
const DEFAULT_EVENT_AVATARS = {
  registration: [
    // Professional conference/meeting avatars - using simpler SVGs
    'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%236366f1"/%3E%3Ccircle cx="200" cy="160" r="50" fill="white" opacity="0.9"/%3E%3Crect x="150" y="220" width="100" height="120" rx="10" fill="white" opacity="0.9"/%3E%3Ctext x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold"%3EEvent%3C/text%3E%3C/svg%3E',
    'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%23ef4444"/%3E%3Crect x="50" y="100" width="300" height="200" rx="20" fill="white" opacity="0.9"/%3E%3Crect x="80" y="140" width="240" height="8" fill="%23ef4444"/%3E%3Crect x="80" y="170" width="240" height="8" fill="%23ef4444"/%3E%3Crect x="80" y="200" width="240" height="8" fill="%23ef4444"/%3E%3Ctext x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold"%3EConference%3C/text%3E%3C/svg%3E',
    'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%2310b981"/%3E%3Crect x="100" y="120" width="200" height="140" rx="15" fill="white" opacity="0.9"/%3E%3Ccircle cx="150" cy="180" r="15" fill="%2310b981"/%3E%3Ccircle cx="200" cy="180" r="15" fill="%2310b981"/%3E%3Ccircle cx="250" cy="180" r="15" fill="%2310b981"/%3E%3Ctext x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold"%3EMeeting%3C/text%3E%3C/svg%3E'
  ],
  ticket: [
    // Entertainment/social event avatars
    'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%23f59e0b"/%3E%3Crect x="80" y="150" width="240" height="120" rx="20" fill="white" opacity="0.9"/%3E%3Ccircle cx="80" cy="210" r="20" fill="%23f59e0b"/%3E%3Ccircle cx="320" cy="210" r="20" fill="%23f59e0b"/%3E%3Ctext x="200" y="220" text-anchor="middle" fill="%23f59e0b" font-family="Arial" font-size="20" font-weight="bold"%3ETICKET%3C/text%3E%3Ctext x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold"%3ETicket%3C/text%3E%3C/svg%3E',
    'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%23f062bf"/%3E%3Ccircle cx="200" cy="150" r="40" fill="white" opacity="0.9"/%3E%3Cpolygon points="200,110 220,140 180,140" fill="%23f062bf"/%3E%3Crect x="160" y="190" width="80" height="60" rx="10" fill="white" opacity="0.9"/%3E%3Ctext x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold"%3EParty%3C/text%3E%3C/svg%3E',
    'data:image/svg+xml;charset=UTF-8,%3Csvg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%239333ea"/%3E%3Cellipse cx="200" cy="180" rx="80" ry="40" fill="white" opacity="0.9"/%3E%3Crect x="180" y="220" width="40" height="80" fill="white" opacity="0.9"/%3E%3Ctext x="200" y="380" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold"%3EShow%3C/text%3E%3C/svg%3E'
  ]
};

/**
 * Get a default avatar for an event based on its type and name
 */
export function getDefaultEventAvatar(eventType: string = 'registration', eventName?: string): string {
  const avatars = DEFAULT_EVENT_AVATARS[eventType as keyof typeof DEFAULT_EVENT_AVATARS] || DEFAULT_EVENT_AVATARS.registration;
  
  // Use event name to consistently select the same avatar for the same event
  const hash = eventName ? hashCode(eventName) : 0;
  const index = Math.abs(hash) % avatars.length;
  
  return avatars[index];
}

/**
 * Simple hash function for consistent avatar selection
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Get event image URL with fallback to default avatar
 */
export function getEventImageUrl(event: any): string {
  if (event?.eventImage) {
    return event.eventImage;
  }
  
  return getDefaultEventAvatar(event?.eventType, event?.name);
}

/**
 * Component for displaying event image with fallback
 */
interface EventImageProps {
  event: any;
  className?: string;
  alt?: string;
}

export function EventImage({ event, className = "", alt }: EventImageProps) {
  const imageUrl = getEventImageUrl(event);
  const altText = alt || (event?.name ? `${event.name} image` : 'Event image');
  
  return (
    <img 
      src={imageUrl} 
      alt={altText}
      className={className}
      onError={(e) => {
        // If custom image fails to load, fallback to default avatar
        const target = e.target as HTMLImageElement;
        if (target.src !== getDefaultEventAvatar(event?.eventType, event?.name)) {
          target.src = getDefaultEventAvatar(event?.eventType, event?.name);
        }
      }}
    />
  );
}