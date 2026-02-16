import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  DollarSign,
  Calendar,
  Building,
  Search,
  Check,
  Clock,
  X,
} from 'lucide-react';
import {
  formatDate,
  getStatusColor,
} from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useSubscriptionRequests } from '@/features/requests';
import { useCategories } from '@/features/categories';
import { useCurrencies } from '@/features/currencies';
import { useAuth } from '@/features/auth';
import { ApprovalsSkeleton } from '@/components/shared/skeletons/PageSkeletons';
import type { Doc } from '../../../convex/_generated/dataModel';

type SubscriptionRequest = Doc<'subscriptionRequests'>;

export default function Approvals() {
  const { requests, isLoading, approve, reject } = useSubscriptionRequests();
  const { categories } = useCategories();
  const { currencies } = useCurrencies();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingRequests = useMemo(
    () => (requests || []).filter((r) => r.status === 'pending'),
    [requests]
  );
  const approvedRequests = useMemo(
    () => (requests || []).filter((r) => r.status === 'approved'),
    [requests]
  );
  const rejectedRequests = useMemo(
    () => (requests || []).filter((r) => r.status === 'rejected'),
    [requests]
  );

  const filterRequests = (reqs: SubscriptionRequest[]) => {
    if (!searchQuery) return reqs;
    return reqs.filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.requestedBy?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        r.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;
    setIsSubmitting(true);
    try {
      await approve({
        adminEmail: user.email,
        id: selectedRequest._id,
        adminNotes: adminNotes || undefined,
      });
      toast.success('Request approved successfully!');
      setIsApproveOpen(false);
      setAdminNotes('');
      setSelectedRequest(null);
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;
    if (!adminNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setIsSubmitting(true);
    try {
      await reject({
        adminEmail: user.email,
        id: selectedRequest._id,
        adminNotes,
      });
      toast.success('Request rejected');
      setIsRejectOpen(false);
      setAdminNotes('');
      setSelectedRequest(null);
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <ApprovalsSkeleton />;
  }

  const RequestCard = ({ request }: { request: SubscriptionRequest }) => {
    const category = categories?.find((c) => c._id === request.categoryId);
    const currency = currencies?.find((c) => c._id === request.currencyId);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: category?.color + '20' }}
            >
              <FileText className="w-6 h-6" style={{ color: category?.color }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{request.name}</p>
              <p className="text-sm text-gray-500 font-mono">{request.referenceNumber}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(request.status)} capitalize flex-shrink-0`}>
            {request.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Building className="w-4 h-4 text-gray-400" />
            <span className="truncate">{request.provider || 'Not specified'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span>
              {currency?.symbol}
              {request.cost} / {request.billingCycle}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span className="truncate">
              {request.requestedBy || 'Anonymous'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDate(request._creationTime)}</span>
          </div>
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => {
                setSelectedRequest(request);
                setIsViewOpen(true);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 rounded-lg"
              onClick={() => {
                setSelectedRequest(request);
                setIsApproveOpen(true);
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 rounded-lg"
              onClick={() => {
                setSelectedRequest(request);
                setIsRejectOpen(true);
              }}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {request.status !== 'pending' && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
              onClick={() => {
                setSelectedRequest(request);
                setIsViewOpen(true);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Approvals</h1>
          <p className="text-gray-500 mt-1">
            Review and manage subscription requests
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl h-12">
          <TabsTrigger value="pending" className="rounded-lg">
            <Clock className="w-4 h-4 mr-2" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg">
            <Check className="w-4 h-4 mr-2" />
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg">
            <X className="w-4 h-4 mr-2" />
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-5">
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filterRequests(pendingRequests).map((request) => (
                <RequestCard key={request._id} request={request} />
              ))}
              {filterRequests(pendingRequests).length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-500">No pending requests to review</p>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="approved" className="mt-5">
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filterRequests(approvedRequests).map((request) => (
                <RequestCard key={request._id} request={request} />
              ))}
              {filterRequests(approvedRequests).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No approved requests yet
                </div>
              )}
            </div>
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="rejected" className="mt-5">
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filterRequests(rejectedRequests).map((request) => (
                <RequestCard key={request._id} request={request} />
              ))}
              {filterRequests(rejectedRequests).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No rejected requests
                </div>
              )}
            </div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>{selectedRequest?.referenceNumber}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Subscription Name</p>
                  <p className="font-medium">{selectedRequest.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-medium">{selectedRequest.provider || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">
                    {categories?.find((c) => c._id === selectedRequest.categoryId)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cost</p>
                  <p className="font-medium">
                    {currencies?.find((c) => c._id === selectedRequest.currencyId)?.symbol}
                    {selectedRequest.cost} / {selectedRequest.billingCycle}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Requested By</p>
                  <p className="font-medium">{selectedRequest.requestedBy || 'Anonymous'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{selectedRequest.requesterDepartment || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedRequest.requesterEmail || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Submitted On</p>
                  <p className="font-medium">{formatDate(selectedRequest._creationTime)}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>
              {selectedRequest.justification && (
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Justification</p>
                  <p className="text-sm">{selectedRequest.justification}</p>
                </div>
              )}
              {selectedRequest.adminNotes && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-700 mb-1">Admin Notes</p>
                  <p className="text-sm">{selectedRequest.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{selectedRequest?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes about this approval..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={isSubmitting}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject <strong>{selectedRequest?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Explain why this request is being rejected..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1.5 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              <XCircle className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
