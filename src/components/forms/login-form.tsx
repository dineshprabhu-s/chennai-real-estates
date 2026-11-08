"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState, useState } from "react";

import { loginAction } from "@/app/admin/login/actions";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  /** Validated local path to return to after a successful sign-in. */
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <FormField label="Email address" htmlFor="login-email" required>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="broker@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password" required>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </FormField>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending}
        aria-busy={isPending}
      >
        <LockKeyhole aria-hidden="true" />
        {isPending ? "Signing in…" : "Sign in"}
      </Button>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-destructive"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
