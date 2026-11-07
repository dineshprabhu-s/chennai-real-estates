/**
 * Centralised Supabase environment configuration.
 *
 * Validation is lazy: importing this module never throws. The values are
 * checked the first time a Supabase client is created, so builds and routes
 * that do not use Supabase keep working when the variables are unset.
 *
 * Only the public project URL and publishable key live here. Server-only
 * secrets must never be imported into a module that can reach the browser.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so they are read through
 * static `process.env.NEXT_PUBLIC_...` references rather than a dynamic
 * lookup that the bundler cannot replace.
 */

export interface SupabasePublicConfig {
  /** Project base URL, e.g. https://your-project.supabase.co */
  url: string;
  /** Publishable (browser-safe) API key. Protected by Row Level Security. */
  publishableKey: string;
}

let cachedConfig: SupabasePublicConfig | null = null;

function configurationError(message: string): Error {
  return new Error(
    [
      message,
      "",
      "To configure Supabase locally:",
      "  1. Copy .env.example to .env.local.",
      "  2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "     from Supabase Dashboard -> Project Settings -> API.",
      "  3. Restart the dev server; NEXT_PUBLIC_* values are read at build time.",
    ].join("\n"),
  );
}

/**
 * Returns the validated public Supabase configuration.
 *
 * Throws a descriptive error when the URL or publishable key is missing or
 * malformed. Successful results are cached because `NEXT_PUBLIC_*` values
 * cannot change without a rebuild.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!rawUrl) {
    throw configurationError(
      "Missing NEXT_PUBLIC_SUPABASE_URL. The Supabase project URL is required to create a client.",
    );
  }

  if (!publishableKey) {
    throw configurationError(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. The Supabase publishable key is required to create a client.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw configurationError(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${rawUrl}". Expected a value like https://your-project.supabase.co.`,
    );
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw configurationError(
      `NEXT_PUBLIC_SUPABASE_URL must use http or https, received "${parsedUrl.protocol}".`,
    );
  }

  // Guard against a secret key being pasted into a public variable. Secret
  // keys bypass Row Level Security and must never reach the browser.
  if (publishableKey.startsWith("sb_secret_")) {
    throw configurationError(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contains a secret key (sb_secret_...). Use the publishable key from the Supabase dashboard and keep secret keys server-side.",
    );
  }

  cachedConfig = {
    url: parsedUrl.origin,
    publishableKey,
  };

  return cachedConfig;
}
