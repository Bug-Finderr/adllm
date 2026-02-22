// Shared proxy secret validation for mutations called by the Edge proxy route
export function requireProxySecret(secret: string) {
  if (secret !== process.env.PROXY_SECRET) {
    throw new Error("Unauthorized");
  }
}
