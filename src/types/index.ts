// Types for Organization Subscription Management System

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number; // relative to INR
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface Subscription {
  id: string;
  referenceNumber: string;
  name: string;
  description: string;
  provider: string;
  categoryId: string;
  category?: Category;
  cost: number;
  currencyId: string;
  currency?: Currency;
  billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  nextRenewalDate: string;
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'other';
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  credentials?: Credential;
  notificationSettings: {
    enabled: boolean;
    daysBefore: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  subscriptionId: string;
  username: string;
  password: string;
  notes?: string;
  lastAccessedAt?: string;
  lastAccessedBy?: string;
}

export interface AuditLog {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  action: 'viewed' | 'copied' | 'updated';
  performedBy: string;
  performedAt: string;
}

export interface SubscriptionRequest {
  id: string;
  referenceNumber: string;
  name: string;
  description: string;
  provider: string;
  categoryId: string;
  cost: number;
  currencyId: string;
  billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  requestedBy: string;
  requesterEmail: string;
  requesterDepartment: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ZeptoMailConfig {
  id: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
}

export interface NotificationSchedule {
  id: string;
  daysBefore: number;
  isEnabled: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export interface DashboardStats {
  totalSubscriptions: number;
  monthlySpendINR: number;
  yearlySpendINR: number;
  upcomingRenewals7Days: number;
  upcomingRenewals30Days: number;
  pendingApprovals: number;
}

export interface SpendingByCategory {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amountINR: number;
  percentage: number;
}

export interface MonthlySpending {
  month: string;
  amountINR: number;
}
