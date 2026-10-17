import { useQuery } from '@tanstack/react-query'
import { getApiClient } from '../client'
import { unwrap } from './_util'

export function useManageOverview(staleDays = 7) {
  return useQuery({
    queryKey: ['manage-overview', staleDays],
    queryFn: async () => (await unwrap(getApiClient().GET('/manage/overview', { params: { query: { staleDays } } }))).data,
  })
}

/** Live sales board: polls every minute so a wall display stays current. */
export function useSalesBoard(period: 'today' | 'week' = 'today') {
  return useQuery({
    queryKey: ['sales-board', period],
    queryFn: async () => (await unwrap(getApiClient().GET('/manage/board', { params: { query: { period } } }))).data,
    refetchInterval: 60_000,
  })
}

export function usePipelineReport(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['report', 'pipeline', range],
    queryFn: async () => (await unwrap(getApiClient().GET('/reports/pipeline', { params: { query: range } }))).data,
  })
}

export function useActivityReport(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['report', 'activity', range],
    queryFn: async () => (await unwrap(getApiClient().GET('/reports/activity', { params: { query: range } }))).data,
  })
}

export function useWorkerRuns(enabled = true) {
  return useQuery({ queryKey: ['worker-runs'], enabled, queryFn: async () => (await unwrap(getApiClient().GET('/diagnostics/worker-runs'))).data })
}

/** Company home page: waiting work, all-time company totals and the viewer's own totals. */
export function useCompanyHome() {
  return useQuery({ queryKey: ['company-home'], queryFn: async () => (await unwrap(getApiClient().GET('/company/home'))).data })
}
