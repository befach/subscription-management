import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useCredentials(adminEmail: string | undefined) {
  const credentials = useQuery(
    api.credentials.list,
    adminEmail ? { adminEmail } : "skip"
  );
  const createMutation = useMutation(api.credentials.create);
  const updateMutation = useMutation(api.credentials.update);
  const removeMutation = useMutation(api.credentials.remove);
  const revealMutation = useMutation(api.credentials.reveal);

  return {
    credentials,
    isLoading: credentials === undefined,
    create: createMutation,
    update: updateMutation,
    remove: removeMutation,
    reveal: revealMutation,
  };
}

export function useCredentialBySubscription(
  adminEmail: string | undefined,
  subscriptionId: Id<"subscriptions"> | undefined
) {
  const credential = useQuery(
    api.credentials.getBySubscription,
    adminEmail && subscriptionId ? { adminEmail, subscriptionId } : "skip"
  );

  return {
    credential,
    isLoading: credential === undefined,
  };
}
