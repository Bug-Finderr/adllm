// Type declaration for Convex environment variables (set via `npx convex env set`)
// Required because Convex's bundled TypeScript doesn't include Node types
declare const process: { env: Record<string, string | undefined> };
