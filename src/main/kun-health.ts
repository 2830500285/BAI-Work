export function isKunHealthResponseBody(body: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(body) as unknown
  } catch {
    return false
  }
  if (!parsed || typeof parsed !== 'object') return false
  const record = parsed as Record<string, unknown>
  if (record.status !== 'ok') return false
  return record.service === 'bai-work' && record.mode === 'adapter'
}
