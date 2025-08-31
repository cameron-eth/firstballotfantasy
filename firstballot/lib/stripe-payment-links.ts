// Client-safe payment links configuration
// This file can be imported on both client and server

export const PAYMENT_LINKS = {
  monthly: 'https://buy.stripe.com/test_dRm3cvdadbi5fdV3oZeAg00',
  yearly: 'https://buy.stripe.com/test_9B600jdaddqdfdV3oZeAg01',
} as const;

export class StripePaymentLinks {
  static getMonthlyLink(): string {
    return PAYMENT_LINKS.monthly;
  }

  static getYearlyLink(): string {
    return PAYMENT_LINKS.yearly;
  }

  static getAllLinks() {
    return PAYMENT_LINKS;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Generate a personalized payment link with pre-filled email
   * @param baseLink - The base Stripe payment link
   * @param email - User's email to pre-fill
   * @returns Payment link with email parameter
   */
  static getPersonalizedLink(baseLink: string, email: string): string {
    if (!email || !this.isValidEmail(email)) {
      console.warn('Invalid email provided for payment link:', email);
      return baseLink;
    }
    
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const url = new URL(baseLink);
      url.searchParams.set('prefilled_email', sanitizedEmail);
      return url.toString();
    } catch (error) {
      console.error('Error creating personalized payment link:', error);
      return baseLink;
    }
  }

  /**
   * Get monthly payment link with user's email pre-filled
   */
  static getMonthlyLinkWithEmail(email: string): string {
    return this.getPersonalizedLink(PAYMENT_LINKS.monthly, email);
  }

  /**
   * Get yearly payment link with user's email pre-filled
   */
  static getYearlyLinkWithEmail(email: string): string {
    return this.getPersonalizedLink(PAYMENT_LINKS.yearly, email);
  }
} 