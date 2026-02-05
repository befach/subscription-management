import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useCurrencies() {
  const currencies = useQuery(api.currencies.list);
  const createMutation = useMutation(api.currencies.create);
  const updateMutation = useMutation(api.currencies.update);
  const removeMutation = useMutation(api.currencies.remove);
  const toggleActiveMutation = useMutation(api.currencies.toggleActive);

  return {
    currencies,
    isLoading: currencies === undefined,
    create: createMutation,
    update: updateMutation,
    remove: removeMutation,
    toggleActive: toggleActiveMutation,
  };
}

export function useActiveCurrencies() {
  const currencies = useQuery(api.currencies.listActive);

  return {
    currencies,
    isLoading: currencies === undefined,
  };
}
