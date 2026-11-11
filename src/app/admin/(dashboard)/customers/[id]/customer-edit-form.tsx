"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateBrokerCustomer } from "../actions";
import { ActionFeedback } from "@/components/admin/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomerEditFormProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    isDemo: boolean;
  };
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || customer.isDemo) return;

    setPending(true);
    setFeedback(null);
    setFields({});

    try {
      const result = await updateBrokerCustomer(customer.id, {
        name,
        phone,
        email,
      });

      if (!result.ok) {
        setFields(result.fields ?? {});
        setFeedback(result.message);
        return;
      }

      setFeedback(
        result.changed
          ? `Customer details saved.${result.warning ? ` ${result.warning}` : ""}`
          : "No customer details changed.",
      );
      if (result.changed) router.refresh();
    } catch {
      setFeedback("Unable to save the customer. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={pending}>
      <FormField
        label="Customer name"
        htmlFor="customer-name"
        required
        error={fields.name}
        errorId="customer-name-error"
      >
        <Input
          id="customer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          autoComplete="name"
          disabled={customer.isDemo || pending}
          aria-invalid={fields.name ? true : undefined}
          aria-describedby={fields.name ? "customer-name-error" : undefined}
        />
      </FormField>

      <FormField
        label="Phone"
        htmlFor="customer-phone"
        required
        hint="Used to match future enquiries to this customer."
        error={fields.phone}
        errorId="customer-phone-error"
      >
        <Input
          id="customer-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          maxLength={64}
          autoComplete="tel"
          disabled={customer.isDemo || pending}
          aria-invalid={fields.phone ? true : undefined}
          aria-describedby={fields.phone ? "customer-phone-error" : undefined}
        />
      </FormField>

      <FormField
        label="Email"
        htmlFor="customer-email"
        error={fields.email}
        errorId="customer-email-error"
      >
        <Input
          id="customer-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          autoComplete="email"
          disabled={customer.isDemo || pending}
          aria-invalid={fields.email ? true : undefined}
          aria-describedby={fields.email ? "customer-email-error" : undefined}
        />
      </FormField>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {customer.isDemo
          ? "This customer is derived only from seeded demo enquiries and is read-only."
          : "Changing a phone number never merges another customer's enquiry history. If the number already belongs to another customer, the save is rejected."}
      </p>

      <ActionFeedback message={feedback} />

      <Button type="submit" disabled={customer.isDemo || pending}>
        {pending ? "Saving…" : "Save customer"}
      </Button>
    </form>
  );
}
