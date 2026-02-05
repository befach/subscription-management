import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useSubscriptions() {
  const subscriptions = useQuery(api.subscriptions.list);
  const createMutation = useMutation(api.subscriptions.create);
  const updateMutation = useMutation(api.subscriptions.update);
  const removeMutation = useMutation(api.subscriptions.remove);

  return {
    subscriptions,
    isLoading: subscriptions === undefined,
    create: createMutation,
    update: updateMutation,
    remove: removeMutation,
  };
}

export function useSubscription(id: Id<"subscriptions"> | undefined) {
  const subscription = useQuery(
    api.subscriptions.get,
    id ? { id } : "skip"
  );

  return {
    subscription,
    isLoading: subscription === undefined,
  };
}

export function useUpcomingRenewals(days: number = 30) {
  const renewals = useQuery(api.subscriptions.listUpcomingRenewals, { days });

  return {
    renewals,
    isLoading: renewals === undefined,
  };
}

export function useSubscriptionsByStatus(
  status: "active" | "expired" | "cancelled" | "pending"
) {
  const subscriptions = useQuery(api.subscriptions.listByStatus, { status });

  return {
    subscriptions,
    isLoading: subscriptions === undefined,
  };
}
