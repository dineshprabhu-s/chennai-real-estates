"use client";

import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Placeholder sign-in form. Authentication is deliberately not implemented in
 * the foundation build; no credentials are stored or transmitted.
 */
export function LoginForm() {
  const [showNotice, setShowNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowNotice(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Email address" htmlFor="login-email" required>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="broker@example.com"
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

      <Button type="submit" className="w-full">
        <LockKeyhole aria-hidden="true" />
        Sign in
      </Button>

      {showNotice ? (
        <p
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
        >
          Authentication is not enabled in this foundation build. Sign-in will
          be connected in a later stage.
        </p>
      ) : null}
    </form>
  );
}
