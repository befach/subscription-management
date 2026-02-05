import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormData, BillingCycle, PaymentMethod, SubscriptionStatus, Category, Currency } from './types';

interface SubscriptionFormProps {
  formData: FormData;
  onChange: (data: FormData) => void;
  categories: Category[] | undefined;
  currencies: Currency[] | undefined;
  mode: 'add' | 'edit';
}

export function SubscriptionForm({
  formData,
  onChange,
  categories,
  currencies,
  mode,
}: SubscriptionFormProps) {
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Name {mode === 'add' && '*'}</Label>
          <Input
            placeholder="e.g., Figma Pro"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <Label>Provider</Label>
          <Input
            placeholder="e.g., Figma Inc."
            value={formData.provider}
            onChange={(e) => updateField('provider', e.target.value)}
            className="mt-1.5 rounded-xl"
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          placeholder="Brief description..."
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          className="mt-1.5 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cost {mode === 'add' && '*'}</Label>
          <Input
            type="number"
            placeholder="e.g., 450"
            value={formData.cost}
            onChange={(e) => updateField('cost', e.target.value)}
            className="mt-1.5 rounded-xl"
          />
        </div>
        {mode === 'add' ? (
          <div>
            <Label>Currency *</Label>
            <Select
              value={formData.currencyId}
              onValueChange={(value) => updateField('currencyId', value)}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies?.filter((c) => c.isActive).map((cur) => (
                  <SelectItem key={cur._id} value={cur._id}>
                    {cur.symbol} {cur.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label>Billing Cycle</Label>
            <Select
              value={formData.billingCycle}
              onValueChange={(value: BillingCycle) => updateField('billingCycle', value)}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {mode === 'add' ? (
          <>
            <div>
              <Label>Billing Cycle</Label>
              <Select
                value={formData.billingCycle}
                onValueChange={(value: BillingCycle) => updateField('billingCycle', value)}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Renewal Date</Label>
              <Input
                type="date"
                value={formData.nextRenewalDate}
                onChange={(e) => updateField('nextRenewalDate', e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: SubscriptionStatus) => updateField('status', value)}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Next Renewal Date</Label>
              <Input
                type="date"
                value={formData.nextRenewalDate}
                onChange={(e) => updateField('nextRenewalDate', e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </>
        )}
      </div>

      {mode === 'add' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => updateField('categoryId', value)}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value: PaymentMethod) => updateField('paymentMethod', value)}
            >
              <SelectTrigger className="mt-1.5 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
