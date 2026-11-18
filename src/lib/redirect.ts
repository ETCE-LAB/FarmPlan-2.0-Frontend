/** Accepts only same-origin app paths as a post-login target, to prevent open redirects. */
export function safeRedirectPath(value: string | null, fallback = '/farms'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value === '/login' || value.startsWith('/login?')) return fallback;
  return value;
}
