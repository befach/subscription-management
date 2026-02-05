import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useSubscriptionRequests() {
  const requests = useQuery(api.subscriptionRequests.list);
  const submitMutation = useMutation(api.subscriptionRequests.submit);
  const approveMutation = useMutation(api.subscriptionRequests.approve);
  const rejectMutation = useMutation(api.subscriptionRequests.reject);
  const removeMutation = useMutation(api.subscriptionRequests.remove);

  return {
    requests,
    isLoading: requests === undefined,
    submit: submitMutation,
    approve: approveMutation,
    reject: rejectMutation,
    remove: removeMutation,
  };
}

export function useRequestsByStatus(
  status: "pending" | "approved" | "rejected"
) {
  const requests = useQuery(api.subscriptionRequests.listByStatus, { status });

  return {
    requests,
    isLoading: requests === undefined,
  };
}

export function usePendingRequestsCount() {
  const count = useQuery(api.subscriptionRequests.getPendingCount);

  return {
    count: count ?? 0,
    isLoading: count === undefined,
  };
}
