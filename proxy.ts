import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const protectedRoutesMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

function isServerActionRequest(request: NextRequest) {
  return request.method === "POST" && request.headers.has("next-action");
}

export default function proxy(request: NextRequest) {
  // Next.js server actions expect a special serialized response shape.
  // If auth middleware redirects these POST requests to /auth/sign-in,
  // the client receives HTML instead and crashes with
  // "An unexpected response was received from the server."
  if (isServerActionRequest(request)) {
    return NextResponse.next();
  }

  return protectedRoutesMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/today/:path*",
    "/tasks/:path*",
    "/habits/:path*",
    "/projects/:path*",
    "/goals/:path*",
    "/health/:path*",
    "/metrics/:path*",
    "/life-areas/:path*",
    "/reviews/:path*",
    "/settings/:path*",
  ],
};
