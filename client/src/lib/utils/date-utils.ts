import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow, parseISO } from 'date-fns';

/**
 * Format a date for display in the UI
 */
export function formatDate(date: string | Date, formatString: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: string | Date, formatString: string = 'MMM dd, yyyy HH:mm'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format a date for display with smart formatting
 * - Today: "Today at 3:30 PM"
 * - Yesterday: "Yesterday at 3:30 PM"
 * - Tomorrow: "Tomorrow at 3:30 PM"
 * - This week: "Monday at 3:30 PM"
 * - Other: "Mar 15, 2024 at 3:30 PM"
 */
export function formatSmartDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const timeString = format(dateObj, 'h:mm a');

  if (isToday(dateObj)) {
    return `Today at ${timeString}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${timeString}`;
  }

  if (isTomorrow(dateObj)) {
    return `Tomorrow at ${timeString}`;
  }

  // For dates within a week, show day name
  const daysAgo = Math.abs(dateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo <= 7) {
    return `${format(dateObj, 'EEEE')} at ${timeString}`;
  }

  // For older dates, show full date
  return `${format(dateObj, 'MMM dd, yyyy')} at ${timeString}`;
}

/**
 * Format a time duration in a human-readable format
 */
export function formatDuration(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  const diffInMinutes = Math.abs(end.getTime() - start.getTime()) / (1000 * 60);
  
  if (diffInMinutes < 60) {
    return `${Math.round(diffInMinutes)} minutes`;
  }
  
  const diffInHours = diffInMinutes / 60;
  if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    const minutes = Math.round((diffInHours - hours) * 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  }
  
  const diffInDays = diffInHours / 24;
  if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    const hours = Math.round((diffInDays - days) * 24);
    return hours > 0 ? `${days}d ${hours}h` : `${days} days`;
  }
  
  const weeks = Math.round(diffInDays / 7);
  return `${weeks} weeks`;
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj < new Date();
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj > new Date();
}

/**
 * Get the status of an event based on its dates
 */
export function getEventStatus(startDate: string | Date, endDate: string | Date): 'upcoming' | 'active' | 'completed' {
  const now = new Date();
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  if (now < start) {
    return 'upcoming';
  }

  if (now >= start && now <= end) {
    return 'active';
  }

  return 'completed';
}

/**
 * Format date for input fields (YYYY-MM-DD format)
 */
export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

/**
 * Format datetime for input fields (YYYY-MM-DDTHH:mm format)
 */
export function formatDateTimeForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Check if registration is open for an event
 */
export function isRegistrationOpen(
  registrationStartDate?: string | Date,
  registrationEndDate?: string | Date
): boolean {
  const now = new Date();

  if (registrationStartDate) {
    const start = typeof registrationStartDate === 'string' ? parseISO(registrationStartDate) : registrationStartDate;
    if (now < start) return false;
  }

  if (registrationEndDate) {
    const end = typeof registrationEndDate === 'string' ? parseISO(registrationEndDate) : registrationEndDate;
    if (now > end) return false;
  }

  return true;
}