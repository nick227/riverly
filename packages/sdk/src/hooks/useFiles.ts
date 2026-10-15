import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiClient } from '../client'
import { unwrap } from './_util'
import { invalidateJob } from './useJobs'

type Target = { opportunityId?: string; contactId?: string; stageId?: string; fieldId?: string }

/** Upload a file once. With a job + field it is linked immediately; otherwise it waits for a note/post. */
export function useUploadAttachment(target: Target = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await unwrap(
        getApiClient().POST('/attachments', {
          params: { query: target },
          body: form as never,
          bodySerializer: (b: unknown) => b as FormData,
        }),
      )).data
    },
    onSuccess: () => {
      if (target.opportunityId && target.fieldId) invalidateJob(qc, target.opportunityId)
    },
  })
}

export function useRemoveAttachmentLink(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: string) => unwrap(getApiClient().DELETE('/attachment-links/{id}', { params: { path: { id: linkId } } })),
    onSuccess: () => invalidateJob(qc, opportunityId),
  })
}
