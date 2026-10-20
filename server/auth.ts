/** Basic-auth check for the deployed demo. Any user name; the password must match DEMO_PASSWORD. */
export function isAuthorized(header: string | null, password: string | undefined): boolean {
  if (!password) return false // no password configured: keep the demo locked
  if (!header?.startsWith('Basic ')) return false
  let decoded: string
  try {
    decoded = atob(header.slice(6))
  } catch {
    return false
  }
  const given = decoded.slice(decoded.indexOf(':') + 1)
  // Compare every character so the time taken doesn't reveal how much matched.
  let diff = given.length ^ password.length
  for (let i = 0; i < Math.max(given.length, password.length); i++) diff |= (given.charCodeAt(i) || 0) ^ (password.charCodeAt(i) || 0)
  return diff === 0
}
