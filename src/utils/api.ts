/**
 * Get the API base URL
 * In production: uses relative URL (same origin) to avoid CORS issues with www/non-www
 * In development: uses VITE_API_URL or localhost:3001
 */
export function getApiUrl(): string {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  // In production, use relative URL (empty string)
  // This makes all API calls go to the same origin as the page
  // Works with both www.domain.com and domain.com
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
