import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";

/**
 * Hook to fetch all personnel/admin accounts
 */
export const useUsers = (options = {}) => {
  return useQuery({
    queryKey: ["personnel"],
    queryFn: async () => {
      const response = await apiGet("/admin/admins"); // ✅ FIX
      return response || [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

export default useUsers;
