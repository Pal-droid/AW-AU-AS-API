import { type NextRequest, NextResponse } from "next/server"

/**
 * CORS middleware that only allows requests from the same domain
 * Automatically detects the deployment domain
 */
export function corsMiddleware(request: NextRequest) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")

  // Get the current deployment URL
  const deploymentUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://${host}`

  // Allow requests from the same domain or no origin (same-origin requests)
  const allowedOrigins = [deploymentUrl, `http://localhost:3000`, `http://localhost:3001`]

  // Check if origin is allowed
  const isAllowed = !origin || allowedOrigins.some((allowed) => origin.startsWith(allowed))

  return {
    isAllowed,
    origin: origin || deploymentUrl,
    deploymentUrl,
  }
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(response: NextResponse, allowedOrigin: string) {
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(request: NextRequest) {
  const { isAllowed, origin } = corsMiddleware(request)

  if (!isAllowed) {
    return new NextResponse(null, {
      status: 403,
      statusText: "Forbidden - CORS policy violation",
    })
  }

  const response = new NextResponse(null, { status: 204 })
  return applyCorsHeaders(response, origin)
}

/**
 * Wrapper for API routes with CORS protection
 */
export function withCors(handler: (request: NextRequest) => Promise<NextResponse> | NextResponse) {
  return async (request: NextRequest) => {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return handleCorsPreFlight(request)
    }

    // Check CORS
    const { isAllowed, origin } = corsMiddleware(request)

    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "CORS policy: Request blocked. This API can only be accessed from the same domain.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Execute handler
    const response = await handler(request)

    // Apply CORS headers
    return applyCorsHeaders(response, origin)
  }
}
