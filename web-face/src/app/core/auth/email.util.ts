const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Simple format check — not exhaustive RFC 5322, just enough to catch obvious typos before submit. */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
