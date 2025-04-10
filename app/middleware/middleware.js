import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/jwt";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/scheduled-posts",
  "/all-posts",
  "/create-post",
  "/account",
];

// Routes that should redirect to dashboard if user is already authenticated
const authRoutes = ["/auth/login", "/auth/register"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get the token from the Authorization header or cookies
  const token =
    request.headers.get("Authorization")?.split(" ")[1] ||
    request.cookies.get("refresh_token")?.value;

  // Check if the route needs authentication
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname.startsWith(route) || pathname === route
  );

  // Check if the route is an auth route (login/register)
  const isAuthRoute = authRoutes.some(
    (route) => pathname.startsWith(route) || pathname === route
  );

  // If it's a protected route and no token, redirect to login
  if (isProtectedRoute && !token) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If token exists, verify it
  if (token) {
    const decoded = verifyToken(token);

    // If token is invalid and the route is protected, redirect to login
    if (!decoded && isProtectedRoute) {
      const url = new URL("/auth/login", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // If token is valid and trying to access login/register, redirect to dashboard
    if (decoded && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Continue with the request in all other cases
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all protected routes
    "/dashboard/:path*",
    "/scheduled-posts/:path*",
    "/all-posts/:path*",
    "/create-post/:path*",
    "/account/:path*",
    // Match authentication routes
    "/auth/login",
    "/auth/register",
    // Don't match API routes, let them handle auth themselves
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
