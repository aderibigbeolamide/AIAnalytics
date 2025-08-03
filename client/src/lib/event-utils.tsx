/**
 * Utility functions for event handling
 */
import React from 'react';

// Default event avatars based on event type and theme
const DEFAULT_EVENT_AVATARS = {
  registration: [
    // Professional conference/meeting avatars
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50MCkiLz4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjQ1JSI+8J+agTwvdGV4dD4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjY1JSI+RXZlbnQ8L3RleHQ+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBzdG9wLWNvbG9yPSIjNjY2NmZmIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzM5M2JmZiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50MCkiLz4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjQ1JSI+8J+OiTwvdGV4dD4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjY1JSI+Q29uZmVyZW5jZTwvdGV4dD4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CjxzdG9wIHN0b3AtY29sb3I9IiNlZjQ0NDQiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZGMyNjI2Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50MCkiLz4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjQ1JSI+8J+PgzwvdGV4dD4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjY1JSI+TWVldGluZzwvdGV4dD4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CjxzdG9wIHN0b3AtY29sb3I9IiMxMGI5ODEiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDU5NjY5Ii8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg=='
  ],
  ticket: [
    // Entertainment/social event avatars
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50MCkiLz4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjQ1JSI+8J+OwjwvdGV4dD4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjY1JSI+VGlja2V0PC90ZXh0Pgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDAiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KPHN0b3Agc3RvcC1jb2xvcj0iI2Y1OWU0YiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNlYTU3MDciLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50MCkiLz4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjQ1JSI+8J+OqTwvdGV4dD4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjY1JSI+UGFydHk8L3RleHQ+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBzdG9wLWNvbG9yPSIjZjA2MmJmIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2QxNDY5NCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSJ1cmwoI2dyYWRpZW50MCkiLz4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjQ1JSI+8J+UpTwvdGV4dD4KPGR0ZXh0IGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iZm9udC1mYW1pbHk6IEludGVyLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiB4PSI1MCUiIHk9IjY1JSI+U2hvdzwvdGV4dD4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CjxzdG9wIHN0b3AtY29sb3I9IiM5MzMzZWEiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNjkxNWNkIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg=='
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