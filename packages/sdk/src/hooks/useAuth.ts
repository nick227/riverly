import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient, ApiError } from '../client'
import type { components } from '../generated/types'

type S = components['schemas']

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error, response } = await getApiClient().GET('/auth/me')
      if (error) throw new ApiError(response.status, (error as any).error)
      return data!
    },
    retry: false,
    staleTime: 60_000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['LoginInput']) => {
      const { data, error, response } = await getApiClient().POST('/auth/login', { body })
      if (error) throw new ApiError(response.status, (error as any).error)
      return data!
    },
    onSuccess: (data) => {
      queryClient.clear()
      queryClient.setQueryData(['me'], data)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await getApiClient().POST('/auth/logout')
      if (error) throw new ApiError(response.status, (error as any).error)
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

// Switching company invalidates every tenant-scoped cache entry.
export function useSwitchOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['SwitchOrganizationInput']) => {
      const { data, error, response } = await getApiClient().POST('/auth/switch-organization', { body })
      if (error) throw new ApiError(response.status, (error as any).error)
      return data!
    },
    onSuccess: (data) => {
      queryClient.clear()
      queryClient.setQueryData(['me'], data)
    },
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['CreateCompanyInput']) => {
      const { data, error, response } = await getApiClient().POST('/auth/company-signup', { body })
      if (error) throw new ApiError(response.status, (error as any).error)
      return data!
    },
    onSuccess: (data) => {
      queryClient.clear()
      queryClient.setQueryData(['me'], data)
    },
  })
}

export function useInvitation(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation', token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await getApiClient().GET('/invitations/{token}', {
        params: { path: { token: token! } },
      })
      if (error) throw new ApiError(response.status, (error as any).error)
      return data!.data
    },
  })
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['AcceptInvitationInput']) => {
      const { data, error, response } = await getApiClient().POST('/invitations/{token}/accept', {
        params: { path: { token } },
        body,
      })
      if (error) throw new ApiError(response.status, (error as any).error)
      return data!
    },
    onSuccess: (data) => {
      queryClient.clear()
      queryClient.setQueryData(['me'], data)
    },
  })
}
