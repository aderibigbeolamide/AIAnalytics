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

export function validateQRData(data: QRData): boolean {
  // Check if QR code is not too old (e.g., 24 hours)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const now = Date.now();
  
  return (now - data.timestamp) <= maxAge;
}
