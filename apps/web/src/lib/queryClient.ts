import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@project/sdk'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Never retry auth/permission/not-found errors; retry transient failures once.
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
    },
  },
})
