import { Request, Response } from 'express';

// Helper function to get the correct app domain
function getAppDomain(): string {
  // Priority 1: Check if APP_DOMAIN is explicitly set (production deployments)
  if (process.env.APP_DOMAIN && process.env.APP_DOMAIN !== 'http://localhost:5000') {
    console.log(`Using APP_DOMAIN: ${process.env.APP_DOMAIN}`);
    return process.env.APP_DOMAIN;
  }
  
  // Priority 2: Check if running on Replit deployment
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }
  
  // Priority 3: Check for Render.com deployment
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  
  // Priority 4: Check for Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Priority 5: Check for Netlify deployment
  if (process.env.NETLIFY) {
    return process.env.URL || `https://${process.env.DEPLOY_PRIME_URL}`;
  }
  
  // Priority 6: Check for Heroku deployment
  if (process.env.DYNO) {
    return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  }
  
  // Priority 7: Check NODE_ENV for production with fallback
  if (process.env.NODE_ENV === 'production') {
    // If in production but no specific domain found, this might be an issue
    console.warn('Running in production but no production domain detected. Using localhost fallback.');
  }
  
  // Final fallback to localhost for local development
  const fallbackDomain = 'http://localhost:5000';
  console.log(`Using fallback domain: ${fallbackDomain}`);
  return fallbackDomain;
}

// Paystack payment initialization with subaccount support
export async function initializePaystackPayment(
  email: string,
  amount: number, // in kobo (smallest currency unit)
  reference: string,
  metadata: any = {},
  subaccountCode?: string, // For multi-tenant payments
  splitConfig?: any, // For payment splitting
  platformFeePercentage?: number // Platform revenue sharing fee (0-20%)
) {
  try {
    const requestBody: any = {
      email,
      amount,
      reference,
      metadata,
      callback_url: `${getAppDomain()}/payment/callback`,
    };

    // Add subaccount for direct payment to organizer with platform fee
    if (subaccountCode) {
      requestBody.subaccount = subaccountCode;
      
      // If platform fee is specified, use percentage charge instead of transaction charge
      if (platformFeePercentage && platformFeePercentage > 0) {
        // Use percentage charge for subaccounts instead of fixed transaction charge
        // This is more reliable with Paystack's API
        const platformFeeAmount = Math.round((amount * platformFeePercentage) / 100);
        
        // Add platform fee info to metadata
        metadata.platformFee = {
          percentage: platformFeePercentage,
          amount: platformFeeAmount,
          amountInNaira: convertFromKobo(platformFeeAmount)
        };
      }
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
    console.log(`Verifying payment with Paystack for reference: ${reference}`);
    console.log(`Using secret key: ${process.env.PAYSTACK_SECRET_KEY ? 'Available' : 'Missing'}`);
    
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    console.log(`Paystack API response status: ${response.status}`);
    const data = await response.json();
    console.log(`Paystack API response data:`, JSON.stringify(data, null, 2));
    
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
    console.log(`Creating Paystack subaccount for: ${businessName}`);
    console.log(`Bank Code: ${bankCode}, Account: ${accountNumber}, Charge: ${percentageCharge}%`);
    console.log(`Using Paystack Secret Key: ${process.env.PAYSTACK_SECRET_KEY ? 'Available' : 'Missing'}`);
    
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
    console.log('Paystack subaccount creation response:', data);
    
    return data;
  } catch (error) {
    console.error('Paystack subaccount creation error:', error);
    throw error;
  }
}

// Rate limiting helper
let lastRequestTime = 0;
const REQUEST_DELAY = 5000; // 5 seconds between requests (increased from 3 seconds)

// Extended cache for verification results (15 minute TTL)
const verificationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Circuit breaker for Paystack API - Fixed implementation
class PaystackCircuitBreaker {
  private consecutive429Count = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly failureThreshold = 3;
  private readonly resetTimeout = 10 * 60 * 1000; // 10 minutes
  private allowProbe = false;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        this.allowProbe = true;
        console.log('Circuit breaker: Moving to half-open state');
      } else {
        throw new Error('Service temporarily unavailable. Please try again in 10 minutes.');
      }
    }

    if (this.state === 'half-open' && !this.allowProbe) {
      throw new Error('Service temporarily unavailable. Please try again in 10 minutes.');
    }

    if (this.state === 'half-open') {
      this.allowProbe = false; // Only allow one probe
    }

    try {
      const result = await fn();
      
      // Reset on any success
      this.consecutive429Count = 0;
      if (this.state === 'half-open') {
        this.state = 'closed';
        console.log('Circuit breaker: Service recovered, moving to closed state');
      }
      
      return result;
    } catch (error: any) {
      if (error.status === 429) {
        this.consecutive429Count++;
        this.lastFailureTime = Date.now();

        if (this.consecutive429Count >= this.failureThreshold) {
          this.state = 'open';
          console.log(`Circuit breaker: ${this.consecutive429Count} consecutive 429 errors, opening circuit`);
        } else if (this.state === 'half-open') {
          this.state = 'open';
          this.lastFailureTime = Date.now();
          console.log('Circuit breaker: 429 error during half-open, re-opening circuit');
        }
      } else {
        // Reset consecutive count on non-429 errors
        this.consecutive429Count = 0;
        
        // If in half-open state and any non-429 error occurs, go back to open state
        if (this.state === 'half-open') {
          this.state = 'open';
          this.lastFailureTime = Date.now();
          console.log('Circuit breaker: Non-429 error during half-open, re-opening circuit');
        }
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }
}

// Global circuit breaker instance
const circuitBreaker = new PaystackCircuitBreaker();

// Request queue for better distribution
class RequestQueue {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private processing = false;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      try {
        // Ensure proper spacing between requests
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < REQUEST_DELAY) {
          const waitTime = REQUEST_DELAY - timeSinceLastRequest;
          await sleep(waitTime);
        }
        // Note: lastRequestTime will be set right before the fetch call

        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }
}

// Global request queue
const requestQueue = new RequestQueue();

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 5000 // Increased base delay to 5 seconds
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // If it's a rate limit error, wait longer
      if (error.status === 429) {
        // Much longer delays for rate limiting: 5s, 15s, 35s
        const delay = baseDelay * Math.pow(3, attempt) + Math.random() * 2000; // Increased multiplier and jitter
        console.log(`Rate limited, retrying in ${Math.round(delay/1000)}s (attempt ${attempt + 1}/${maxRetries + 1})`);
        await sleep(delay);
      } else {
        throw error; // Don't retry non-rate-limit errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Verify bank account details
export async function verifyBankAccount(accountNumber: string, bankCode: string) {
  try {
    console.log(`Verifying account ${accountNumber} with bank code ${bankCode}`);
    console.log(`Using Paystack Secret Key: ${process.env.PAYSTACK_SECRET_KEY ? 'Available' : 'Missing'}`);
    
    // Check cache first
    const cacheKey = `${accountNumber}:${bankCode}`;
    const cached = verificationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Returning cached verification result for ${accountNumber}`);
      return cached.result;
    }
    
    // Use request queue and circuit breaker for better reliability (correct order)
    const result = await requestQueue.add(async () => {
      return await circuitBreaker.call(async () => {
        return await retryWithBackoff(async () => {
          // Set timing right before actual network call
          lastRequestTime = Date.now();
          
          const response = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
            }
          );

      if (!response.ok) {
        console.error('Paystack API response not OK:', response.status, response.statusText);
        
        // For rate limit errors, throw an error to trigger retry
        if (response.status === 429) {
          const error = new Error(`Rate limited: ${response.status} ${response.statusText}`);
          (error as any).status = 429;
          throw error;
        }
        
        return {
          status: false,
          message: `API error: ${response.status} ${response.statusText}`
        };
      }
      
      // Process the response here, inside the retry block
      const responseText = await response.text();
      if (!responseText) {
        console.error('Empty response from Paystack API');
        return {
          status: false,
          message: 'Empty response from bank verification service'
        };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Paystack response:', responseText);
        return {
          status: false,
          message: 'Invalid response format from bank verification service'
        };
      }
      console.log('Paystack verification response:', data);
      
      // If the response is unsuccessful, return a more specific error
      if (!data.status) {
        let errorMessage = data.message || "Could not resolve account name. Check parameters or try again.";
        
        // Provide more helpful error messages based on error codes
        if (data.code === 'invalid_bank_code') {
          errorMessage = "Invalid bank code. Please ensure you selected the correct bank.";
        } else if (data.code === 'invalid_account') {
          errorMessage = "Invalid account number. Please check your account number and try again.";
        }
        
        return {
          status: false,
          message: errorMessage
        };
      }
      
          return data;
        });
      });
    });
    
    // Cache successful results
    if (result && result.status) {
      console.log(`Caching verification result for ${accountNumber}`);
      verificationCache.set(cacheKey, {
        result: result,
        timestamp: Date.now()
      });
    }
    
    return result;
  } catch (error: any) {
    console.error('Bank account verification error:', error);
    
    // Handle circuit breaker errors
    if (error.message.includes('Service temporarily unavailable')) {
      return {
        status: false,
        message: "Bank verification service is temporarily unavailable due to high traffic. Please wait 10 minutes and try again."
      };
    }
    
    // For rate limit errors, provide a more user-friendly message
    if (error.status === 429) {
      return {
        status: false,
        message: "Service temporarily busy due to high traffic. Please wait a few minutes and try again."
      };
    }
    
    return {
      status: false,
      message: "Bank verification failed. Please check your account details and try again."
    };
  }
}

// Get comprehensive list of Nigerian banks including microfinance banks
export async function getNigerianBanks() {
  try {
    const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();
    
    if (data.status) {
      // Sort banks by name and categorize
      const sortedBanks = data.data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      // Add type categorization for better UX
      const categorizedBanks = sortedBanks.map((bank: any) => ({
        ...bank,
        type: bank.name.toLowerCase().includes('microfinance') || 
              bank.name.toLowerCase().includes('micro finance') ? 'microfinance' : 'commercial'
      }));
      
      return {
        ...data,
        data: categorizedBanks
      };
    }
    
    return data;
  } catch (error) {
    console.error('Get banks error:', error);
    throw error;
  }
}

// Create Paystack subaccount for direct payments to organizers
export async function createSubaccount(data: {
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number;
  description?: string;
  primary_contact_email?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  metadata?: any;
}) {
  try {
    const response = await fetch('https://api.paystack.co/subaccount', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Create subaccount error:', error);
    throw error;
  }
}