import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useDashboardStats() {
  const stats = useQuery(api.dashboard.getStats);

  return {
    stats,
    isLoading: stats === undefined,
  };
}

export function usePublicDashboardStats() {
  const stats = useQuery(api.dashboard.getPublicStats);

  return {
    stats,
    isLoading: stats === undefined,
  };
}

export function useSpendingByCategory() {
  const spending = useQuery(api.dashboard.getSpendingByCategory);

  return {
    spending,
    isLoading: spending === undefined,
  };
}
