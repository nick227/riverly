import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']

/** The company's latest published workflow — drives every label, stage and field in the UI. */
export function useWorkflow() {
  return useQuery({ queryKey: ['workflow'], queryFn: async () => (await unwrap(getApiClient().GET('/workflow'))).data, staleTime: 5 * 60_000 })
}

export function usePublishWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['PublishWorkflowInput']) => (await unwrap(getApiClient().POST('/workflow/publish', { body }))).data,
    onSuccess: (data) => {
      qc.setQueryData(['workflow'], data)
      qc.invalidateQueries({ queryKey: ['opportunities'] })
      qc.invalidateQueries({ queryKey: ['opportunity'] })
    },
  })
}

export function useResources() {
  return useQuery({ queryKey: ['resources'], queryFn: async () => (await unwrap(getApiClient().GET('/resources'))).data, staleTime: 5 * 60_000 })
}

export function useSaveResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: S['ResourceInput'] & { id?: string }) =>
      id
        ? (await unwrap(getApiClient().PATCH('/resources/{id}', { params: { path: { id } }, body }))).data
        : (await unwrap(getApiClient().POST('/resources', { body: body as S['ResourceInput'] & { label: string; url: string } }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  })
}
