/**
 * Get the API base URL
 * In production: uses relative URL (same origin) to avoid CORS issues with www/non-www
 * In development: uses Vite proxy (empty string) to proxy to localhost:3000
 */
export function getApiUrl(): string {
  // In both development and production, use relative URL (empty string)
  // In development: Vite proxy will forward /api requests to localhost:3000
  // In production: requests go to the same origin as the page
  return '';
}

/**
 * Get the SDR server URL
 * In production: uses relative URL (same origin)
 * In development: uses specific SDR port
 */
export function getSdrUrl(): string {
  if (import.meta.env.DEV) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return apiUrl.replace(':3000', ':3002').replace(':3001', ':3002');
  }

  // In production, SDR endpoints are proxied through Nginx to the same origin
  return '';
}
