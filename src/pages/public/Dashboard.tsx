import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  IndianRupee,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  daysUntil,
  getStatusColor,
} from '@/lib/utils';
import { motion } from 'framer-motion';
import { usePublicDashboardStats } from '@/features/dashboard';
import { useUpcomingRenewals } from '@/features/subscriptions';
import { useCategories } from '@/features/categories';
import { useRequestsByStatus } from '@/features/requests';
import { DashboardSkeleton } from '@/components/shared/skeletons/PageSkeletons';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PublicDashboard() {
  const { stats, isLoading: statsLoading } = usePublicDashboardStats();
  const { renewals: upcomingRenewals, isLoading: renewalsLoading } = useUpcomingRenewals(30);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { requests: approvedRequests, isLoading: requestsLoading } = useRequestsByStatus('approved');

  const isLoading = statsLoading || renewalsLoading || categoriesLoading || requestsLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const displayRenewals = (upcomingRenewals || []).slice(0, 5);
  const recentApprovals = (approvedRequests || [])
    .sort(
      (a, b) =>
        new Date(b.reviewedAt || 0).getTime() -
        new Date(a.reviewedAt || 0).getTime()
    )
    .slice(0, 3);

  const statsData = [
    {
      label: 'Total Subscriptions',
      value: stats?.totalSubscriptions ?? 0,
      icon: CreditCard,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Monthly Spend',
      value: formatCurrency(stats?.monthlySpendINR ?? 0),
      icon: IndianRupee,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Upcoming Renewals',
      value: stats?.upcomingRenewals ?? 0,
      icon: Calendar,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Active Subscriptions',
      value: stats?.activeSubscriptions ?? 0,
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 md:space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Team Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of your organization's subscriptions
          </p>
        </div>
        <Link to="/submit">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/20">
            <Sparkles className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </Link>
      </motion.div>

      {/* Submit Request Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-0 shadow-xl shadow-blue-600/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <CardContent className="p-5 md:p-6 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-blue-200" />
                  <p className="text-blue-100 text-sm font-medium">Need a New Subscription?</p>
                </div>
                <p className="text-xl md:text-2xl font-bold">Submit a Request</p>
                <p className="text-blue-100 text-sm mt-2">
                  Submit a request to add a new subscription for your team
                </p>
              </div>
              <Link to="/submit">
                <Button
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30 w-full md:w-auto"
                >
                  Submit Request
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="h-full border-slate-200/60 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-gray-500 truncate">{stat.label}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br ${stat.color} bg-clip-text`} style={{ color: 'inherit' }} />
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
                <Link to="/subscriptions">
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {displayRenewals.map((subscription, idx) => {
                  const days = daysUntil(subscription.nextRenewalDate);
                  const category = categories?.find(
                    (c) => c._id === subscription.categoryId
                  );
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
                          <Clock className="w-3 h-3" />
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
                {displayRenewals.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No upcoming renewals
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recently Approved */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-slate-200/60">
            <CardContent className="p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recently Approved</h3>
                <p className="text-sm text-gray-500">Latest approved requests</p>
              </div>
              <div className="space-y-3">
                {recentApprovals.map((request, idx) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {request.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {request.requestedBy} • {request.requesterDepartment}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.reviewedAt
                          ? formatDate(request.reviewedAt)
                          : '-'}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {recentApprovals.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No recently approved requests
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
