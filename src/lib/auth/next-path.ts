const INTERNAL_ORIGIN = "https://internal.invalid";
const LOGIN_PATH = "/admin/login";

/**
 * Returns a safe, local path for post-login navigation, or `null` when the
 * value could redirect the browser somewhere else.
 *
 * Only same-origin paths are accepted. Protocol-relative URLs (`//host`),
 * absolute URLs, backslash tricks, and the login page itself are rejected.
 */
export function sanitizeNextPath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim();

  if (!candidate.startsWith("/")) {
    return null;
  }

  // Browsers treat `//host` as protocol-relative and `\` like `/`, so both
  // can escape the current origin even though the value starts with a slash.
  if (candidate.startsWith("//") || candidate.includes("\\")) {
    return null;
  }

  if (/[\u0000-\u001f\u007f]/.test(candidate)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(candidate, INTERNAL_ORIGIN);
  } catch {
    return null;
  }

  // Any input that parsed as a different origin was not a local path.
  if (url.origin !== INTERNAL_ORIGIN) {
    return null;
  }

  if (url.pathname === LOGIN_PATH || url.pathname.startsWith(`${LOGIN_PATH}/`)) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
