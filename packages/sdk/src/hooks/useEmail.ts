import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']

export function useEmailTemplates() {
  return useQuery({ queryKey: ['email-templates'], queryFn: async () => (await unwrap(getApiClient().GET('/email/templates'))).data, staleTime: 5 * 60_000 })
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: S['UpdateEmailTemplateInput'] & { id: string }) =>
      (await unwrap(getApiClient().PATCH('/email/templates/{id}', { params: { path: { id } }, body }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}

/** Preview is fetched fresh each time the modal opens or the template changes. */
export function useRenderEmail(input: S['RenderEmailInput'] | null) {
  return useQuery({
    queryKey: ['email-render', input],
    enabled: !!input,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => (await unwrap(getApiClient().POST('/email/render', { body: input! }))).data,
  })
}

export function useSendEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['SendEmailInput']) => (await unwrap(getApiClient().POST('/email/messages', { body }))).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['activity'] })
      qc.invalidateQueries({ queryKey: ['messages'] })
      qc.invalidateQueries({ queryKey: ['contact', vars.contactId] })
      if (vars.opportunityId) qc.invalidateQueries({ queryKey: ['opportunity', vars.opportunityId] })
    },
  })
}

export function useMessage(id: string | null) {
  return useQuery({
    queryKey: ['message', id],
    enabled: !!id,
    queryFn: async () => (await unwrap(getApiClient().GET('/email/messages/{id}', { params: { path: { id: id! } } }))).data,
  })
}

export function useRetryMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await unwrap(getApiClient().POST('/email/messages/{id}/retry', { params: { path: { id } } }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity'] })
      qc.invalidateQueries({ queryKey: ['message'] })
    },
  })
}

export function useSenders() {
  return useQuery({ queryKey: ['senders'], queryFn: async () => (await unwrap(getApiClient().GET('/email/senders'))).data })
}

export function useCreateSender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['CreateSenderInput']) => (await unwrap(getApiClient().POST('/email/senders', { body }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['senders'] }),
  })
}

export function useVerifySender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await unwrap(getApiClient().POST('/email/senders/{id}/verify', { params: { path: { id } } }))).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['senders'] }),
  })
}

export function useDeleteSender() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(getApiClient().DELETE('/email/senders/{id}', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['senders'] }),
  })
}
