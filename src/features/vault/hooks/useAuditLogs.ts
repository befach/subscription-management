import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useAuditLogs(adminEmail: string | undefined) {
  const logs = useQuery(
    api.auditLogs.list,
    adminEmail ? { adminEmail } : "skip"
  );

  return {
    logs,
    isLoading: logs === undefined,
  };
}

export function useAuditLogsBySubscription(
  adminEmail: string | undefined,
  subscriptionId: Id<"subscriptions"> | undefined
) {
  const logs = useQuery(
    api.auditLogs.listBySubscription,
    adminEmail && subscriptionId ? { adminEmail, subscriptionId } : "skip"
  );

  return {
    logs,
    isLoading: logs === undefined,
  };
}

export function useRecentAuditLogs(adminEmail: string | undefined, limit: number = 10) {
  const logs = useQuery(
    api.auditLogs.listRecent,
    adminEmail ? { adminEmail, limit } : "skip"
  );

  return {
    logs,
    isLoading: logs === undefined,
  };
}
