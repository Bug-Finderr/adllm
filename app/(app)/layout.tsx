import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>{children}</ConvexAuthNextjsServerProvider>
  );
}
