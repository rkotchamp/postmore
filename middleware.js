import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/authenticate",
  "/scheduled-posts",
  "/profile",
  "/all-posts",
];

// Routes that should redirect to dashboard if user is already authenticated
const authRoutes = ["/auth/login", "/auth/register"];

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    console.log("🔒 Middleware processing:", {
      pathname,
      hasToken: !!token,
      userEmail: token?.email || "No email",
    });

    // Check if the route needs authentication
    const isProtectedRoute = protectedRoutes.some(
      (route) => pathname.startsWith(route) || pathname === route
    );

    // Check if the route is an auth route (login/register)
    const isAuthRoute = authRoutes.some(
      (route) => pathname.startsWith(route) || pathname === route
    );

    console.log("🔍 Route analysis:", {
      isProtectedRoute,
      isAuthRoute,
      pathname,
    });

    // If user is authenticated and trying to access auth routes, redirect to dashboard
    if (token && isAuthRoute) {
      console.log(
        "🔄 Authenticated user on auth route, redirecting to dashboard"
      );
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If user is authenticated and trying to access root route, redirect to dashboard
    if (token && pathname === "/") {
      console.log(
        "🏠 Authenticated user on root route, redirecting to dashboard"
      );
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Continue with the request in all other cases
    console.log("✅ Continuing with request");
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Check if the route needs authentication
        const isProtectedRoute = protectedRoutes.some(
          (route) => pathname.startsWith(route) || pathname === route
        );

        // If it's a protected route, require authentication
        if (isProtectedRoute) {
          return !!token;
        }

        // For non-protected routes, allow access
        return true;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [
    // Match all protected routes
    "/dashboard/:path*",
    "/authenticate/:path*",
    "/scheduled-posts/:path*",
    "/profile/:path*",
    "/all-posts/:path*",
    // Match authentication routes
    "/auth/login",
    "/auth/register",
    // Match root route specifically
    "/",
    // Don't match API routes, static files, etc.
    "/((?!api|_next/static|_next/image|favicon.ico|public|.*\\.).*)",
  ],
};
