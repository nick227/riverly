import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components, operations } from '../generated/types'
import { idempotencyKey, unwrap } from './_util'

type S = components['schemas']
export type OpportunityListParams = NonNullable<operations['listOpportunities']['parameters']['query']>

export function useOpportunities(params: OpportunityListParams = {}) {
  return useInfiniteQuery({
    queryKey: ['opportunities', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      unwrap(getApiClient().GET('/opportunities', { params: { query: { ...params, q: params.q || undefined, cursor: pageParam } } })),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: ['opportunity', id],
    enabled: !!id,
    queryFn: async () => (await unwrap(getApiClient().GET('/opportunities/{id}', { params: { path: { id: id! } } }))).data,
  })
}

/** Everything a job write can change: the job, its contact card, lists and the river. */
export function invalidateJob(qc: QueryClient, id: string) {
  qc.invalidateQueries({ queryKey: ['opportunity', id] })
  qc.invalidateQueries({ queryKey: ['opportunities'] })
  qc.invalidateQueries({ queryKey: ['contact'] })
  qc.invalidateQueries({ queryKey: ['contacts'] })
  qc.invalidateQueries({ queryKey: ['activity'] })
  qc.invalidateQueries({ queryKey: ['manage-overview'] })
}

export function useUpdateOpportunity(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['UpdateOpportunityInput']) =>
      (await unwrap(getApiClient().PATCH('/opportunities/{id}', { params: { path: { id } }, body }))).data,
    onSuccess: () => invalidateJob(qc, id),
  })
}

export function useSetOpportunityField(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: string; value: unknown }) =>
      (await unwrap(getApiClient().PUT('/opportunities/{id}/fields/{fieldId}', { params: { path: { id, fieldId } }, body: { value } }))).data,
    onSuccess: () => invalidateJob(qc, id),
  })
}

/** Explicit manual stage change. One idempotency key per user action. */
export function useTransitionOpportunity(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ toStageId, reason }: { toStageId: string; reason?: string | null }) =>
      (await unwrap(
        getApiClient().POST('/opportunities/{id}/transitions', { params: { path: { id } }, body: { toStageId, reason, idempotencyKey: idempotencyKey() } }),
      )).data,
    onSuccess: () => invalidateJob(qc, id),
  })
}

export function useSetOpportunityStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ status, reason }: { status: S['OpportunityStatus']; reason?: string | null }) =>
      (await unwrap(getApiClient().POST('/opportunities/{id}/status', { params: { path: { id } }, body: { status, reason, idempotencyKey: idempotencyKey() } }))).data,
    onSuccess: () => invalidateJob(qc, id),
  })
}
