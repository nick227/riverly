import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components, operations } from '../generated/types'
import { idempotencyKey, unwrap } from './_util'
import { invalidateJob } from './useJobs'

type S = components['schemas']
export type ActivityParams = Omit<NonNullable<operations['listActivity']['parameters']['query']>, 'cursor'>

export function useActivity(params: ActivityParams = {}, options: { refetchInterval?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['activity', 'list', params],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => unwrap(getApiClient().GET('/activity', { params: { query: { ...params, q: params.q || undefined, cursor: pageParam } } })),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    refetchInterval: options.refetchInterval,
  })
}

/** Count of river entries recorded after `since` — powers the unobtrusive "new activity" pill. */
export function useNewActivityCount(params: ActivityParams, since: string | null) {
  return useQuery({
    queryKey: ['activity', 'new', params, since],
    enabled: !!since,
    refetchInterval: 30_000,
    queryFn: async () => (await unwrap(getApiClient().GET('/activity', { params: { query: { ...params, since: since!, limit: 50 } } }))).data.length,
  })
}

export function useLogActivity(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Omit<S['LogActivityInput'], 'idempotencyKey'> & { idempotencyKey?: string }) =>
      (await unwrap(
        getApiClient().POST('/opportunities/{id}/activities', { params: { path: { id: opportunityId } }, body: { ...body, idempotencyKey: body.idempotencyKey ?? idempotencyKey() } }),
      )).data,
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}

export function useCorrectActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Omit<S['CorrectActivityInput'], 'idempotencyKey'> & { id: string }) =>
      (await unwrap(getApiClient().POST('/activity/{id}/corrections', { params: { path: { id } }, body: { ...body, idempotencyKey: idempotencyKey() } }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity'] }),
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Omit<S['CreatePostInput'], 'idempotencyKey'> & { idempotencyKey?: string }) =>
      (await unwrap(getApiClient().POST('/posts', { body: { ...body, idempotencyKey: body.idempotencyKey ?? idempotencyKey() } }))).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['activity'] })
      if (vars.opportunityId) qc.invalidateQueries({ queryKey: ['opportunity', vars.opportunityId] })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (postId: string) => unwrap(getApiClient().DELETE('/posts/{id}', { params: { path: { id: postId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity'] }),
  })
}

export function useComments(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comments', eventId],
    enabled,
    queryFn: async () => (await unwrap(getApiClient().GET('/activity/{id}/comments', { params: { path: { id: eventId } } }))).data,
  })
}

export function useCreateComment(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => (await unwrap(getApiClient().POST('/activity/{id}/comments', { params: { path: { id: eventId } }, body: { body } }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', eventId] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

export function useToggleReaction(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: S['ReactionInput']['code']) =>
      (await unwrap(getApiClient().POST('/activity/{id}/reactions', { params: { path: { id: eventId } }, body: { code } }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activity'] }),
  })
}
