import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']

export function useSources() {
  return useQuery({ queryKey: ['sources'], queryFn: async () => (await unwrap(getApiClient().GET('/sources'))).data })
}

export function usePreviewImport() {
  return useMutation({ mutationFn: async (body: S['CsvInput']) => (await unwrap(getApiClient().POST('/imports/preview', { body }))).data })
}

export function useRunImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['CsvInput']) => (await unwrap(getApiClient().POST('/imports', { body }))).data,
    onSuccess: () => {
      for (const key of ['imports', 'contacts', 'opportunities', 'review-queue', 'sources', 'activity']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}

export function useImports(enabled = true) {
  return useQuery({ queryKey: ['imports'], enabled, queryFn: async () => (await unwrap(getApiClient().GET('/imports'))).data })
}

export function useReviewQueue() {
  return useQuery({ queryKey: ['review-queue'], queryFn: async () => (await unwrap(getApiClient().GET('/intake/review'))).data })
}

export function useResolveReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: S['ResolveReviewInput'] & { id: string }) =>
      (await unwrap(getApiClient().POST('/intake/review/{id}', { params: { path: { id } }, body }))).data,
    onSuccess: () => {
      for (const key of ['review-queue', 'contacts', 'opportunities', 'activity', 'sources']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}

export function useLeadForms() {
  return useQuery({ queryKey: ['lead-forms'], queryFn: async () => (await unwrap(getApiClient().GET('/lead-forms'))).data })
}

export function useSaveLeadForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: S['LeadFormInput'] & { id?: string }) =>
      id
        ? (await unwrap(getApiClient().PATCH('/lead-forms/{id}', { params: { path: { id } }, body }))).data
        : (await unwrap(getApiClient().POST('/lead-forms', { body: body as S['LeadFormInput'] & { label: string } }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lead-forms'] }),
  })
}

export function usePublicForm(token: string | undefined) {
  return useQuery({
    queryKey: ['public-form', token],
    enabled: !!token,
    retry: false,
    queryFn: async () => (await unwrap(getApiClient().GET('/public/forms/{token}', { params: { path: { token: token! } } }))).data,
  })
}

export function useSubmitPublicForm(token: string) {
  return useMutation({
    mutationFn: async (body: S['PublicSubmissionInput']) =>
      (await unwrap(getApiClient().POST('/public/forms/{token}/submissions', { params: { path: { token } }, body }))).data,
  })
}
