"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { sanitizeNextPath } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

const INVALID_CREDENTIALS_MESSAGE = "Email or password is incorrect.";
const NOT_BROKER_MESSAGE =
  "This account does not have broker access. Contact the site owner if you believe this is a mistake.";
const TEMPORARILY_UNAVAILABLE_MESSAGE =
  "Sign in is temporarily unavailable. Please try again.";
const MISSING_FIELDS_MESSAGE = "Enter your email address and password.";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getSignInErrorMessage(error: AuthError): string {
  if (error.status === 429) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  if (typeof error.status === "number" && error.status >= 500) {
    return TEMPORARILY_UNAVAILABLE_MESSAGE;
  }

  // Everything else (including invalid credentials and unconfirmed email) is
  // reported generically so the form never reveals which detail was wrong.
  return INVALID_CREDENTIALS_MESSAGE;
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = readField(formData, "email").trim();
  const password = readField(formData, "password");
  const nextPath = sanitizeNextPath(readField(formData, "next"));

  if (!email || !password) {
    return { error: MISSING_FIELDS_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: getSignInErrorMessage(signInError) };
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims) {
    await supabase.auth.signOut();
    return { error: TEMPORARILY_UNAVAILABLE_MESSAGE };
  }

  const role: unknown = data.claims.app_metadata?.role;

  if (role !== "broker") {
    // Never keep a non-broker session alive after a successful password check.
    await supabase.auth.signOut();
    return { error: NOT_BROKER_MESSAGE };
  }

  redirect(nextPath ?? "/admin/dashboard");
}
