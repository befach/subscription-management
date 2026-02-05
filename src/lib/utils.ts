import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with Indian numbering system
export function formatCurrency(amount: number, _currencyCode: string = 'INR', _symbol: string = '₹'): string {
  // Convert to INR if needed (mock conversion for demo)
  const inrAmount = amount;
  
  // Format with Indian numbering system (lakhs, crores)
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return formatter.format(inrAmount);
}

// Format date to readable string
export function formatDate(dateInput: string | number | undefined | null): string {
  if (dateInput === undefined || dateInput === null) return 'N/A';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid date';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Invalid date';
  }
}

// Format date with time
export function formatDateTime(dateInput: string | number | undefined | null): string {
  if (dateInput === undefined || dateInput === null) return 'N/A';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Invalid date';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Invalid date';
  }
}

// Calculate days until date
export function daysUntil(dateString: string | undefined | null): number {
  if (!dateString) return 0;
  try {
    const targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) return 0;
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return 0;
  }
}

// Get status badge color
export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'expired':
    case 'rejected':
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// Generate reference number
export function generateReferenceNumber(type: 'subscription' | 'request' = 'subscription'): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 999) + 1;
  const paddedNum = randomNum.toString().padStart(3, '0');
  return type === 'subscription' ? `SUB-${year}-${paddedNum}` : `REQ-${year}-${paddedNum}`;
}

// Calculate billing amount based on cycle
export function calculateMonthlyCost(cost: number, billingCycle: string): number {
  switch (billingCycle) {
    case 'monthly':
      return cost;
    case 'quarterly':
      return cost / 3;
    case 'half-yearly':
      return cost / 6;
    case 'yearly':
      return cost / 12;
    default:
      return cost;
  }
}

// Mask sensitive text
export function maskText(text: string | undefined | null, visibleStart: number = 2, visibleEnd: number = 2): string {
  if (!text) return '••••••••';
  if (text.length <= visibleStart + visibleEnd) {
    return '•'.repeat(text.length);
  }
  const start = text.slice(0, visibleStart);
  const end = text.slice(-visibleEnd);
  const middle = '•'.repeat(text.length - visibleStart - visibleEnd);
  return `${start}${middle}${end}`;
}
