/** Vite accepts a base without a trailing slash; asset concatenation must not. */
export function normalizeBasePath(value: string | undefined): string {
  const base = value?.trim() || '/';
  return base.endsWith('/') ? base : `${base}/`;
}
