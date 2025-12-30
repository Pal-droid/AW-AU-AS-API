/**
 * Safely parses query parameters from a request URL.
 *
 * This utility avoids issues with Next.js App Router URL normalization
 * that can corrupt or drop hyphenated query parameter values.
 *
 * It uses the raw URL string and parses the query string directly
 * to bypass any middleware URL manipulation.
 */
export function getQueryParams(request: Request): URLSearchParams {
  // Get the raw URL string
  const url = request.url

  // Find the query string portion
  const queryIndex = url.indexOf("?")

  if (queryIndex === -1) {
    return new URLSearchParams()
  }

  // Extract just the query string (everything after ?)
  const queryString = url.slice(queryIndex + 1)

  // Parse it directly without URL normalization
  return new URLSearchParams(queryString)
}

/**
 * Get a specific query parameter value safely
 */
export function getQueryParam(request: Request, key: string): string | null {
  const params = getQueryParams(request)
  return params.get(key)
}
