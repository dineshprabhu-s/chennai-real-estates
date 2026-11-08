import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/common/logo";
import { LoginForm } from "@/components/forms/login-form";
import { sanitizeNextPath } from "@/lib/auth/next-path";

export const metadata: Metadata = {
  title: "Broker login",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * The login page reads `searchParams` for the post-login destination and the
 * broker authorization error. It therefore renders at request time; opting out
 * of static-shell validation keeps that explicit without affecting other
 * routes.
 */
export const instant = false;

const highlights = [
  "A single workspace for listings and enquiries.",
  "Local area notes kept alongside each property.",
  "Built for one broker, not a crowded marketplace.",
];

interface AdminLoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(firstValue(params.next));
  const notBroker = firstValue(params.error) === "not-broker";

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -top-28 -right-24 size-96 rounded-full border border-primary-foreground/10"
        />
        <div
          aria-hidden="true"
          className="absolute -right-8 -bottom-40 size-[30rem] rounded-full border border-primary-foreground/10"
        />

        <div className="relative">
          <Logo inverse />
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/60 uppercase">
            Broker workspace
          </p>
          <p className="mt-4 font-display text-4xl leading-[1.1] tracking-tight xl:text-5xl">
            Your listings, enquiries, and local knowledge in one calm place.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
            Chennai Real Estates is a focused, single-broker platform for
            Madipakkam. Sign in to manage listings, enquiries, and local area
            notes.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-primary-foreground/75"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary-foreground/50"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/50">
          Madipakkam · Chennai · Foundation build
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6 lg:justify-end">
          <Logo className="lg:hidden" showTagline={false} />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to website
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-6">
          <div className="w-full max-w-sm">
            <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-primary">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
              Broker sign in
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Access property management, enquiries, and area tools.
            </p>

            {notBroker ? (
              <p
                role="alert"
                className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-destructive"
              >
                This account does not have broker access. Sign in with a broker
                account to continue.
              </p>
            ) : null}

            <div className="mt-6">
              <LoginForm next={next ?? undefined} />
            </div>
          </div>
        </div>

        <footer className="px-6 py-5 text-center text-xs text-muted-foreground">
          © Chennai Real Estates · Madipakkam, Chennai
        </footer>
      </main>
    </div>
  );
}
