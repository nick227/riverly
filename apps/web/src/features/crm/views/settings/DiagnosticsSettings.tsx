import { useWorkerRuns } from '@project/sdk'
import { Badge } from '@/components/patterns/Badge'
import { Card, CardHeader } from '@/components/patterns/Card'
import { EmptyState, SkeletonList } from '@/components/patterns/States'
import { dateTime } from '@/lib/format'

/** Operational worker log — kept out of the Activity river on purpose. */
export function DiagnosticsSettings() {
  const runs = useWorkerRuns()
  if (runs.isLoading) return <SkeletonList rows={3} />
  return (
    <Card>
      <CardHeader title="Background worker runs" />
      {runs.data?.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>When</th><th>Job</th><th>Status</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {runs.data.map((r) => (
                <tr key={r.id}>
                  <td className="text--tabular">{dateTime(r.startedAt)}</td>
                  <td>{r.kind}</td>
                  <td><Badge tone={r.status === 'SUCCEEDED' ? 'success' : r.status === 'FAILED' ? 'danger' : 'warning'}>{r.status.toLowerCase().replace('_', ' ')}</Badge></td>
                  <td className="text--muted"><code>{JSON.stringify(r.detail)}</code>{r.error ? ` — ${r.error}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState compact title="No worker runs yet." />
      )}
    </Card>
  )
}
