import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']
type IntegrationProvider = S['IntegrationProvider']

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => (await unwrap(getApiClient().GET('/integrations'))).data,
  })
}

export function useIntegration(provider: IntegrationProvider | undefined) {
  return useQuery({
    queryKey: ['integration', provider],
    enabled: !!provider,
    queryFn: async () => (await unwrap(getApiClient().GET('/integrations/{provider}', { params: { path: { provider: provider! } } }))).data,
  })
}

export function useUpdateIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ provider, ...body }: S['UpdateIntegrationInput'] & { provider: IntegrationProvider }) =>
      (await unwrap(getApiClient().PUT('/integrations/{provider}', { params: { path: { provider } }, body }))).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration', vars.provider] })
    },
  })
}

export function useTestIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ provider, ...body }: S['TestIntegrationInput'] & { provider: IntegrationProvider }) =>
      (await unwrap(getApiClient().POST('/integrations/{provider}/test', { params: { path: { provider } }, body }))).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration', vars.provider] })
    },
  })
}

export function useSyncIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ provider, ...body }: S['SyncIntegrationInput'] & { provider: IntegrationProvider }) =>
      (await unwrap(getApiClient().POST('/integrations/{provider}/sync', { params: { path: { provider } }, body }))).data,
    onSuccess: () => {
      for (const key of ['integrations', 'imports', 'contacts', 'opportunities', 'review-queue', 'sources', 'activity']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export function useDisconnectIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (provider: IntegrationProvider) =>
      (await unwrap(getApiClient().DELETE('/integrations/{provider}', { params: { path: { provider } } }))).data,
    onSuccess: (_data, provider) => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      qc.invalidateQueries({ queryKey: ['integration', provider] })
    },
  })
}
