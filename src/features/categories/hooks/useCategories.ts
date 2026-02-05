import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useCategories() {
  const categories = useQuery(api.categories.list);
  const createMutation = useMutation(api.categories.create);
  const updateMutation = useMutation(api.categories.update);
  const removeMutation = useMutation(api.categories.remove);

  return {
    categories,
    isLoading: categories === undefined,
    create: createMutation,
    update: updateMutation,
    remove: removeMutation,
  };
}
