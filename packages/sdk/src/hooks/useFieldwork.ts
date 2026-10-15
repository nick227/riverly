import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'
import { invalidateJob } from './useJobs'

type S = components['schemas']

export function useCreateAppointment(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['CreateAppointmentInput']) =>
      (await unwrap(getApiClient().POST('/opportunities/{id}/appointments', { params: { path: { id: opportunityId } }, body }))).data,
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}

export function useUpdateAppointment(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: S['UpdateAppointmentInput'] & { id: string }) =>
      (await unwrap(getApiClient().PATCH('/appointments/{id}', { params: { path: { id } }, body }))).data,
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}

export function useAddParticipant(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['AddParticipantInput']) =>
      (await unwrap(getApiClient().POST('/opportunities/{id}/participants', { params: { path: { id: opportunityId } }, body }))).data,
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}

export function useRemoveParticipant(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(getApiClient().DELETE('/participants/{id}', { params: { path: { id } } })),
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}

export function useExternalPeople(q: string) {
  return useQuery({
    queryKey: ['external-people', q],
    queryFn: async () => (await unwrap(getApiClient().GET('/external-people', { params: { query: { q: q || undefined } } }))).data,
    staleTime: 60_000,
  })
}

export function useCreateExternalPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['ExternalPersonInput']) => (await unwrap(getApiClient().POST('/external-people', { body }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['external-people'] }),
  })
}

export function useSaveExternalLink(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: S['ExternalLinkInput'] & { id?: string }) =>
      id
        ? (await unwrap(getApiClient().PATCH('/external-links/{id}', { params: { path: { id } }, body }))).data
        : (await unwrap(
            getApiClient().POST('/opportunities/{id}/external-links', { params: { path: { id: opportunityId } }, body: body as S['ExternalLinkInput'] & { kind: NonNullable<S['ExternalLinkInput']['kind']>; label: string } }),
          )).data,
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}
