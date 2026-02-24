import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicLanding = createRouteMatcher(["/"]);
const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
]);

export default convexAuthNextjsMiddleware(async (request) => {
  // Read the auth cookie directly — avoids a Convex network call on every request
  const token =
    request.cookies.get("__convexAuthJWT")?.value ??
    request.cookies.get("__Host-__convexAuthJWT")?.value;
  const isAuthenticated = !!token;

  // Authenticated users on landing/signin → redirect to dashboard
  if ((isPublicLanding(request) || isSignInPage(request)) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  // Unauthenticated users on protected routes → redirect to signin
  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
