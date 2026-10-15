import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']

export function useOrganization() {
  return useQuery({ queryKey: ['organization'], queryFn: async () => (await unwrap(getApiClient().GET('/organization'))).data })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['UpdateOrganizationInput']) => (await unwrap(getApiClient().PATCH('/organization', { body }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useMembers() {
  return useQuery({ queryKey: ['members'], queryFn: async () => (await unwrap(getApiClient().GET('/members'))).data, staleTime: 60_000 })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, ...body }: S['UpdateMemberInput'] & { userId: string }) =>
      (await unwrap(getApiClient().PATCH('/members/{id}', { params: { path: { id: userId } }, body }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useInvitations(enabled = true) {
  return useQuery({ queryKey: ['invitations'], enabled, queryFn: async () => (await unwrap(getApiClient().GET('/team/invitations'))).data })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['CreateInvitationInput']) => (await unwrap(getApiClient().POST('/team/invitations', { body }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(getApiClient().DELETE('/team/invitations/{id}', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  })
}
