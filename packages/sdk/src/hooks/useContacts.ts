import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']

export function useContacts(params: { q?: string; sourceId?: string; limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['contacts', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => unwrap(getApiClient().GET('/contacts', { params: { query: { ...params, q: params.q || undefined, cursor: pageParam } } })),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contact', id],
    enabled: !!id,
    queryFn: async () => (await unwrap(getApiClient().GET('/contacts/{id}', { params: { path: { id: id! } } }))).data,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['CreateContactInput']) => (await unwrap(getApiClient().POST('/contacts', { body }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['ContactFields']) => (await unwrap(getApiClient().PATCH('/contacts/{id}', { params: { path: { id } }, body }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] })
      qc.invalidateQueries({ queryKey: ['opportunity'] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

export function useMatchContacts() {
  return useMutation({
    mutationFn: async (body: S['ContactMatchInput']) => (await unwrap(getApiClient().POST('/contacts/match', { body }))).data,
  })
}

export function useCreateOpportunity(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['NewJobFields']) =>
      (await unwrap(getApiClient().POST('/contacts/{id}/opportunities', { params: { path: { id: contactId } }, body }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] })
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunity'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
