import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Filter, X, CreditCard } from 'lucide-react';
import { useSubscriptions } from '@/features/subscriptions';
import { useCategories } from '@/features/categories';
import { useCurrencies } from '@/features/currencies';
import { useAuth } from '@/features/auth';
import { SubscriptionsSkeleton } from '@/components/shared/skeletons/PageSkeletons';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SubscriptionCard } from './SubscriptionCard';
import { AddDialog, ViewDialog, EditDialog, DeleteDialog } from './SubscriptionDialogs';
import { initialFormData } from './types';
import type { FormData, Subscription } from './types';
import type { Id } from '../../../../convex/_generated/dataModel';

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const { subscriptions, isLoading, create, update, remove } = useSubscriptions();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { currencies, isLoading: currenciesLoading } = useCurrencies();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions.filter((sub) => {
      const matchesSearch =
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' || sub.categoryId === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' || sub.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [subscriptions, searchQuery, categoryFilter, statusFilter]);

  const activeFiltersCount =
    (categoryFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedSubscription || !user?.email) return;
    setIsSaving(true);
    try {
      await remove({ adminEmail: user.email, id: selectedSubscription._id });
      toast.success('Subscription deleted successfully!');
      setIsDeleteOpen(false);
      setSelectedSubscription(null);
    } catch {
      toast.error('Failed to delete subscription');
    }
    setIsSaving(false);
  }, [selectedSubscription, remove, user?.email]);

  const handleSave = useCallback(async () => {
    if (!selectedSubscription || !user?.email) return;
    setIsSaving(true);
    try {
      await update({
        adminEmail: user.email,
        id: selectedSubscription._id,
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        categoryId: formData.categoryId as Id<'categories'>,
        cost: parseFloat(formData.cost),
        currencyId: formData.currencyId as Id<'currencies'>,
        billingCycle: formData.billingCycle,
        nextRenewalDate: formData.nextRenewalDate,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notificationEnabled: formData.notificationEnabled,
        notificationDaysBefore: formData.notificationDaysBefore,
      });
      toast.success('Subscription updated successfully!');
      setIsEditOpen(false);
      setSelectedSubscription(null);
    } catch {
      toast.error('Failed to update subscription');
    }
    setIsSaving(false);
  }, [selectedSubscription, formData, update, user?.email]);

  const handleAdd = useCallback(async () => {
    if (!formData.name || !formData.categoryId || !formData.currencyId || !formData.cost || !user?.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSaving(true);
    try {
      await create({
        adminEmail: user.email,
        name: formData.name,
        description: formData.description,
        provider: formData.provider,
        categoryId: formData.categoryId as Id<'categories'>,
        cost: parseFloat(formData.cost),
        currencyId: formData.currencyId as Id<'currencies'>,
        billingCycle: formData.billingCycle,
        nextRenewalDate: formData.nextRenewalDate || new Date().toISOString().split('T')[0],
        paymentMethod: formData.paymentMethod,
        status: formData.status,
        notificationEnabled: formData.notificationEnabled,
        notificationDaysBefore: formData.notificationDaysBefore,
      });
      toast.success('Subscription added successfully!');
      setIsAddOpen(false);
      setFormData(initialFormData);
    } catch {
      toast.error('Failed to add subscription');
    }
    setIsSaving(false);
  }, [formData, create, user?.email]);

  const openEditDialog = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setFormData({
      name: subscription.name,
      description: subscription.description,
      provider: subscription.provider,
      categoryId: subscription.categoryId,
      cost: subscription.cost.toString(),
      currencyId: subscription.currencyId,
      billingCycle: subscription.billingCycle,
      nextRenewalDate: subscription.nextRenewalDate,
      paymentMethod: subscription.paymentMethod,
      status: subscription.status,
      notificationEnabled: subscription.notificationEnabled,
      notificationDaysBefore: subscription.notificationDaysBefore,
    });
    setIsEditOpen(true);
  }, []);

  if (isLoading || categoriesLoading || currenciesLoading) {
    return <SubscriptionsSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-500 mt-1">Manage all organization subscriptions</p>
        </div>
        <Button
          onClick={() => {
            setFormData(initialFormData);
            setIsAddOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by name, provider, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 rounded-xl">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}

          <span className="text-sm text-gray-500 ml-auto">
            {filteredSubscriptions.length} result{filteredSubscriptions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredSubscriptions.map((subscription, idx) => (
            <SubscriptionCard
              key={subscription._id}
              subscription={subscription as Subscription}
              onView={() => {
                setSelectedSubscription(subscription as Subscription);
                setIsViewOpen(true);
              }}
              onEdit={() => openEditDialog(subscription as Subscription)}
              onDelete={() => {
                setSelectedSubscription(subscription as Subscription);
                setIsDeleteOpen(true);
              }}
              index={idx}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredSubscriptions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AddDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleAdd}
        isSaving={isSaving}
        categories={categories}
        currencies={currencies}
      />

      <ViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        subscription={selectedSubscription}
      />

      <EditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSave}
        isSaving={isSaving}
        categories={categories}
        currencies={currencies}
      />

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        subscriptionName={selectedSubscription?.name}
        onConfirm={handleDelete}
        isDeleting={isSaving}
      />
    </motion.div>
  );
}
