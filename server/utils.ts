import { Request } from "express";

/**
 * Get the base URL for the application
 * This handles both local development and production deployments
 */
export function getBaseUrl(req?: Request): string {
  // If APP_DOMAIN is set in environment, use it
  if (process.env.APP_DOMAIN) {
    return process.env.APP_DOMAIN;
  }
  
  // If request is available, construct from request headers
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
    return `${protocol}://${host}`;
  }
  
  // Fallback for development
  return process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:5000';
}

/**
 * Generate registration URL for an event
 */
export function getRegistrationUrl(eventId: number, req?: Request): string {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/register/${eventId}`;
}

/**
 * Generate report URL for an event
 */
export function getReportUrl(eventId: number, req?: Request): string {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/report/${eventId}`;
}

/**
 * Generate QR code URL for a registration
 */
export function getQRUrl(registrationId: number, req?: Request): string {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/qr/${registrationId}`;
}