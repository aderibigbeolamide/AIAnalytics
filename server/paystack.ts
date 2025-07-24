import { Request, Response } from 'express';

// Paystack payment initialization with subaccount support
export async function initializePaystackPayment(
  email: string,
  amount: number, // in kobo (smallest currency unit)
  reference: string,
  metadata: any = {},
  subaccountCode?: string, // For multi-tenant payments
  splitConfig?: any // For payment splitting
) {
  try {
    const requestBody: any = {
      email,
      amount,
      reference,
      metadata,
      callback_url: `${process.env.APP_DOMAIN || 'http://localhost:5000'}/payment/callback`,
    };

    // Add subaccount for direct payment to organizer
    if (subaccountCode) {
      requestBody.subaccount = subaccountCode;
    }

    // Add split payment configuration
    if (splitConfig) {
      requestBody.split = splitConfig;
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

// Create Paystack subaccount for event organizers
export async function createPaystackSubaccount(
  businessName: string,
  bankCode: string,
  accountNumber: string,
  percentageCharge: number = 0 // Platform fee
) {
  try {
    const response = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: percentageCharge,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Paystack subaccount creation error:', error);
    throw error;
  }
}

// Verify bank account details
export async function verifyBankAccount(accountNumber: string, bankCode: string) {
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Bank account verification error:', error);
    throw error;
  }
}

// Get list of Nigerian banks
export async function getNigerianBanks() {
  try {
    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get banks error:', error);
    throw error;
  }
}