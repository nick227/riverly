import { useMembers } from '@project/sdk'
import { Select } from '@/components/primitives/Controls'

export function MemberSelect({ value, onChange, id, placeholder = 'Unassigned', autoFocus }: { value: string | null; onChange: (v: string | null) => void; id?: string; placeholder?: string; autoFocus?: boolean }) {
  const members = useMembers()
  const options = (members.data ?? [])
    .filter((m) => m.status === 'ACTIVE' || m.userId === value)
    .map((m) => ({ value: m.userId, label: m.displayName }))
  return <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} options={options} placeholder={placeholder} autoFocus={autoFocus} />
}

export function useMemberName() {
  const members = useMembers()
  return (id: string | null | undefined) => members.data?.find((m) => m.userId === id)?.displayName ?? null
}
