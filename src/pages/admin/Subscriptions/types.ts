import type { Id } from '../../../../convex/_generated/dataModel';

export type BillingCycle = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface FormData {
  name: string;
  description: string;
  provider: string;
  categoryId: string;
  cost: string;
  currencyId: string;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  paymentMethod: PaymentMethod;
  status: SubscriptionStatus;
  notificationEnabled: boolean;
  notificationDaysBefore: number;
}

export const initialFormData: FormData = {
  name: '',
  description: '',
  provider: '',
  categoryId: '',
  cost: '',
  currencyId: '',
  billingCycle: 'monthly',
  nextRenewalDate: '',
  paymentMethod: 'credit_card',
  status: 'active',
  notificationEnabled: true,
  notificationDaysBefore: 7,
};

export interface Category {
  _id: Id<'categories'>;
  name: string;
  color: string;
}

export interface Currency {
  _id: Id<'currencies'>;
  code: string;
  symbol: string;
  isActive: boolean;
}

export interface Subscription {
  _id: Id<'subscriptions'>;
  name: string;
  description: string;
  provider: string;
  referenceNumber: string;
  categoryId: Id<'categories'>;
  cost: number;
  currencyId: Id<'currencies'>;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  paymentMethod: PaymentMethod;
  status: SubscriptionStatus;
  notificationEnabled: boolean;
  notificationDaysBefore: number;
  category?: Category;
  currency?: Currency;
}
