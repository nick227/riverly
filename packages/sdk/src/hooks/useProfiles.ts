import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import type { components } from '../generated/types'
import { unwrap } from './_util'

type S = components['schemas']

export function useProfile(slug: string | undefined) {
  return useQuery({
    queryKey: ['profile', slug],
    enabled: !!slug,
    queryFn: async () => (await unwrap(getApiClient().GET('/profiles/{slug}', { params: { path: { slug: slug! } } }))).data,
  })
}

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['UpdateProfileInput']) => unwrap(getApiClient().PATCH('/profiles/me', { body })),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data)
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useRecognitionTypes() {
  return useQuery({ queryKey: ['recognition-types'], queryFn: async () => (await unwrap(getApiClient().GET('/recognition-types'))).data, staleTime: 10 * 60_000 })
}

export function useGiveRecognition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: S['GiveRecognitionInput']) => (await unwrap(getApiClient().POST('/recognitions', { body }))).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
