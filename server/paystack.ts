import { Request, Response } from 'express';

// Paystack payment initialization
export async function initializePaystackPayment(
  email: string,
  amount: number, // in kobo (smallest currency unit)
  reference: string,
  metadata: any = {},
  publicKey: string
) {
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        reference,
        metadata,
        callback_url: `${process.env.APP_DOMAIN}/payment/callback`,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Paystack initialization error:', error);
    throw error;
  }
}

// Verify Paystack payment
export async function verifyPaystackPayment(reference: string) {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Paystack verification error:', error);
    throw error;
  }
}

// Generate unique payment reference
export function generatePaymentReference(prefix = 'EVT'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

// Convert amount to kobo (smallest currency unit for NGN)
export function convertToKobo(amount: string | number): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.round(numAmount * 100);
}

// Convert from kobo to naira
export function convertFromKobo(amount: number): number {
  return amount / 100;
}