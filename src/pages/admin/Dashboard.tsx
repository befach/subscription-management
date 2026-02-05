import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  IndianRupee,
  Calendar,
  CheckSquare,
  ArrowRight,
  AlertCircle,
  Plus,
  Lock,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { useDashboardStats } from '@/features/dashboard';
import { useUpcomingRenewals } from '@/features/subscriptions';
import { usePendingRequestsCount } from '@/features/requests';
import { useCategories } from '@/features/categories';
import { DashboardSkeleton } from '@/components/shared/skeletons/PageSkeletons';
import {
  formatCurrency,
  daysUntil,
} from '@/lib/utils';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const { renewals, isLoading: renewalsLoading } = useUpcomingRenewals(30);
  const { count: pendingCount, isLoading: pendingLoading } = usePendingRequestsCount();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const isLoading = statsLoading || renewalsLoading || pendingLoading || categoriesLoading;

  // All hooks must be called before any early returns
  const upcomingRenewals = useMemo(() => renewals?.slice(0, 5) || [], [renewals]);

  // Create category map for O(1) lookups in render
  type Category = NonNullable<typeof categories>[number];
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, Category>();
    return new Map(categories.map((c) => [c._id as string, c]));
  }, [categories]);

  // Memoize stat cards to prevent recalculation on every render
  const statCards = useMemo(() => [
    {
      label: 'Total Subscriptions',
      value: stats?.totalSubscriptions || 0,
      icon: CreditCard,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+12%',
    },
    {
      label: 'Monthly Spend',
      value: formatCurrency(stats?.monthlySpendINR || 0),
      icon: IndianRupee,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: '+5%',
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: CheckSquare,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      alert: (pendingCount ?? 0) > 0,
    },
    {
      label: 'Upcoming Renewals',
      value: stats?.upcomingRenewals30Days || 0,
      icon: Calendar,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      sublabel: 'Next 30 days',
    },
  ], [stats, pendingCount]);

  // Memoize quick actions to prevent recalculation on every render
  const quickActions = useMemo(() => [
    {
      path: '/admin/approvals',
      icon: CheckSquare,
      title: 'Review Approvals',
      subtitle: `${pendingCount ?? 0} pending`,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
    },
    {
      path: '/admin/vault',
      icon: Lock,
      title: 'Credential Vault',
      subtitle: 'Manage access',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      path: '/admin/currencies',
      icon: IndianRupee,
      title: 'Currencies',
      subtitle: 'Exchange rates',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
    },
    {
      path: '/admin/settings',
      icon: Settings,
      title: 'Settings',
      subtitle: 'Configure system',
      color: 'from-slate-500 to-gray-500',
      bgColor: 'bg-slate-50',
    },
  ], [pendingCount]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage subscriptions, approvals, and settings
          </p>
        </div>
        <Link to="/admin/subscriptions">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" />
            Add Subscription
          </Button>
        </Link>
      </motion.div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900">
                    {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-amber-700">
                    Review and approve subscription requests from team members
                  </p>
                </div>
                <Link to="/admin/approvals" className="flex-shrink-0">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    Review
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="h-full border-slate-200/60 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-500 truncate">{stat.label}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    {stat.trend && (
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600">{stat.trend}</span>
                      </div>
                    )}
                    {stat.sublabel && (
                      <p className="text-xs text-gray-400 mt-1">{stat.sublabel}</p>
                    )}
                  </div>
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br ${stat.color} bg-clip-text`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Upcoming Renewals */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-slate-200/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Renewals</h3>
                  <p className="text-sm text-gray-500">Subscriptions renewing soon</p>
                </div>
                <Link to="/admin/subscriptions">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingRenewals.map((subscription, idx) => {
                  const days = daysUntil(subscription.nextRenewalDate);
                  const category = categoryMap.get(subscription.categoryId);
                  return (
                    <motion.div
                      key={subscription._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: category?.color + '20' }}
                        >
                          <CreditCard
                            className="w-5 h-5"
                            style={{ color: category?.color }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {subscription.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {subscription.provider}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(subscription.cost)}
                        </p>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          <span
                            className={
                              days <= 7
                                ? 'text-red-600 font-medium'
                                : 'text-gray-500'
                            }
                          >
                            {days} days
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {upcomingRenewals.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No upcoming renewals
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-slate-200/60">
            <CardContent className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-500">Frequently used features</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, idx) => (
                  <Link key={action.path} to={action.path}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full h-auto py-4 justify-start border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${action.bgColor}`}>
                          <action.icon className="w-5 h-5" style={{ color: 'inherit' }} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm">{action.title}</p>
                          <p className="text-xs text-gray-500">{action.subtitle}</p>
                        </div>
                      </Button>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
