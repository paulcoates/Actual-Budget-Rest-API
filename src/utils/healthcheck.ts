export const HEALTHCHECK_PATHS = [
  '/livez',
  '/api/livez',
  '/readyz',
  '/api/readyz',
  '/healthcheck',
  '/api/healthcheck',
] as const;

export function isHealthCheckPath(path: string): boolean {
  return (HEALTHCHECK_PATHS as readonly string[]).includes(path);
}
