import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default convexAuthNextjsMiddleware(
  async (request) => {
    // Read the auth cookie directly — avoids a Convex network call on every request
    const token =
      request.cookies.get("__convexAuthJWT")?.value ??
      request.cookies.get("__Host-__convexAuthJWT")?.value;
    const isAuthenticated = !!token;

    if (isSignInPage(request) && isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
    if (isProtectedRoute(request) && !isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/signin");
    }
  },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
