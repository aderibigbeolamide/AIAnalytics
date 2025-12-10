import QRCode from "qrcode";
import { randomBytes } from "crypto";

export interface QRData {
  registrationId: number;
  eventId: number;
  memberId?: number;
  type: "member" | "guest" | "invitee";
  timestamp: number;
}

export function generateQRCode(): string {
  return randomBytes(16).toString("hex");
}

export function generateShortUniqueId(): string {
  // Generate a 6-character letter-based ID for easier manual input
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateQRImage(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    throw new Error("Failed to generate QR code image");
  }
}

export function encryptQRData(data: QRData): string {
  // Simple encoding for demonstration
  // In production, use proper encryption
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
  return encoded;
}

export function decryptQRData(encoded: string): QRData | null {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded) as QRData;
  } catch {
    return null;
  }
}

/**
 * Validates QR code data based on event end date or a default expiry period.
 * @param data - The QR code data to validate
 * @param eventEndDate - Optional event end date. If provided, QR is valid until this date.
 *                       If not provided, uses a 30-day default expiry from QR creation.
 * @returns boolean indicating if the QR code is valid
 */
export function validateQRData(data: QRData, eventEndDate?: Date | string | null): boolean {
  const now = Date.now();
  
  // If timestamp is 0 or missing, consider it valid (legacy support)
  if (!data.timestamp || data.timestamp === 0) {
    return true;
  }
  
  // If eventEndDate is provided, validate against it (with 24-hour buffer after event end)
  if (eventEndDate) {
    const endDate = typeof eventEndDate === 'string' ? new Date(eventEndDate) : eventEndDate;
    if (!isNaN(endDate.getTime())) {
      // QR code is valid until 24 hours after event ends
      const bufferMs = 24 * 60 * 60 * 1000; // 24 hours buffer
      return now <= endDate.getTime() + bufferMs;
    }
  }
  
  // Default: 30-day expiry from QR creation
  const defaultMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  return (now - data.timestamp) <= defaultMaxAge;
}
