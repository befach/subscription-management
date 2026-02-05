import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { formatCurrency, daysUntil, getStatusColor } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { Subscription } from './types';

interface SubscriptionCardProps {
  subscription: Subscription;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  index: number;
}

export function SubscriptionCard({
  subscription,
  onView,
  onEdit,
  onDelete,
  index,
}: SubscriptionCardProps) {
  const category = subscription.category;
  const days = daysUntil(subscription.nextRenewalDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -4 }}
    >
      <Card className="h-full border-slate-200/60 hover:shadow-lg transition-all">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: category?.color + '20' }}
              >
                <CreditCard
                  className="w-6 h-6"
                  style={{ color: category?.color }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-1">
                  {subscription.name}
                </h3>
                <p className="text-sm text-gray-500 font-mono">
                  {subscription.referenceNumber}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Provider</span>
              <span className="font-medium">{subscription.provider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Cost</span>
              <span className="font-medium">
                {formatCurrency(subscription.cost)} / {subscription.billingCycle}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Renewal</span>
              <span className={`font-medium ${days <= 7 ? 'text-red-600' : ''}`}>
                <Calendar className="w-3 h-3 inline mr-1" />
                {days} days
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: category?.color + '20',
                color: category?.color,
              }}
            >
              {category?.name}
            </span>
            <Badge className={`${getStatusColor(subscription.status)} capitalize`}>
              {subscription.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
