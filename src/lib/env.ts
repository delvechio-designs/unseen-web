// Reads required environment variables at call time so the build does not fail
// when a key is not set yet. Throws a clear error the first time a missing key is used.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Add it to .env.local or Vercel.`);
  }
  return value;
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
