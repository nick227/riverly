export function normalizeEmail(email: string | null | undefined): string | null {
  const v = email?.trim().toLowerCase()
  return v && v.includes('@') ? v : null
}

// North American default: strip formatting and a leading country code 1.
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  return digits.length >= 7 ? digits : null
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
