export const HEALTHCHECK_PATHS = ['/healthcheck', '/api/healthcheck'] as const;

export function isHealthCheckPath(path: string): boolean {
  return (HEALTHCHECK_PATHS as readonly string[]).includes(path);
}
