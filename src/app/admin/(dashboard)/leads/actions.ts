"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireBroker } from "@/lib/auth/broker";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leadStatusLabels, leadStatusOptions } from "@/modules/leads/constants";
import type { LeadStatus } from "@/types/lead";

export type LeadActionResult =
  | { ok: true; id: string; changed: boolean; warning?: string }
  | {
      ok: false;
      kind: "validation" | "not-found" | "demo" | "conflict" | "database";
      message: string;
      fields?: Record<string, string>;
    };

interface LeadWriteRow {
  id: string;
  status: LeadStatus;
  is_demo: boolean;
}

function databaseError(error: { code?: string } | null): LeadActionResult {
  switch (error?.code) {
    case "23503":
      return {
        ok: false,
        kind: "validation",
        message: "The lead or related record is no longer available.",
      };
    case "23514":
    case "23502":
    case "22P02":
    case "22003":
    case "22007":
      return {
        ok: false,
        kind: "validation",
        message: "The lead details are invalid. Review the request and try again.",
      };
    default:
      return {
        ok: false,
        kind: "database",
        message: "Unable to save the lead. Please try again.",
      };
  }
}

function validLeadId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value &&
    value.length <= 64 &&
    !/[/\\?#]/.test(value)
  );
}

function revalidateLeadPages(): boolean {
  let success = true;

  for (const path of ["/admin/leads", "/admin/dashboard"]) {
    try {
      revalidatePath(path);
    } catch {
      success = false;
    }
  }

  return success;
}

/**
 * Persists a lead status change and records one activity entry.
 *
 * The update is conditional on the status that was just read, so a concurrent
 * change is reported instead of silently overwriting it. Demo leads are
 * rejected from the authoritative database row, never from caller input.
 */
export async function updateBrokerLeadStatus(
  id: unknown,
  status: unknown,
): Promise<LeadActionResult> {
  await requireBroker();

  if (!validLeadId(id)) {
    return {
      ok: false,
      kind: "validation",
      message: "Enter a valid lead ID.",
      fields: { id: "Enter a valid lead ID." },
    };
  }

  if (
    typeof status !== "string" ||
    !leadStatusOptions.some((option) => option.value === status)
  ) {
    return {
      ok: false,
      kind: "validation",
      message: "Choose a valid lead status.",
      fields: { status: "Choose a valid lead status." },
    };
  }

  const nextStatus = status as LeadStatus;

  try {
    const supabase = await createSupabaseServerClient();
    const projection = "id,status,is_demo";
    const { data, error: readError } = await supabase
      .from("leads")
      .select(projection)
      .eq("id", id)
      .maybeSingle();

    if (readError) return databaseError(readError);
    if (data === null) {
      return { ok: false, kind: "not-found", message: "Lead not found." };
    }

    const existing = data as unknown as LeadWriteRow;
    if (existing.is_demo) {
      return {
        ok: false,
        kind: "demo",
        message: "Seeded demo enquiries are read-only.",
      };
    }

    if (existing.status === nextStatus) {
      return { ok: true, id, changed: false };
    }

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({ status: nextStatus })
      .eq("id", id)
      .eq("status", existing.status)
      .select("id,status")
      .maybeSingle();

    if (updateError) return databaseError(updateError);
    if (updated === null) {
      return {
        ok: false,
        kind: "conflict",
        message:
          "This lead was updated by another session. Refresh the inbox and try again.",
      };
    }

    const activity = {
      id: randomUUID(),
      lead_id: id,
      occurred_at: new Date().toISOString(),
      label: `Status changed to ${leadStatusLabels[nextStatus]}`,
      detail: `Moved from ${leadStatusLabels[existing.status]} to ${leadStatusLabels[nextStatus]}.`,
    };
    const { error: activityError } = await supabase
      .from("lead_activities")
      .insert(activity);

    let warning: string | undefined;
    if (activityError) {
      warning = "Status saved, but the activity entry could not be logged.";
    }

    if (!revalidateLeadPages() && !warning) {
      warning = "Status saved, but some pages could not be refreshed.";
    }

    return { ok: true, id, changed: true, ...(warning ? { warning } : {}) };
  } catch {
    return databaseError(null);
  }
}

/**
 * Persists an internal broker note and records one activity entry.
 *
 * The note body is trimmed and sent alone; the database generates the note ID
 * and timestamp. The private note body is never copied into the activity
 * detail.
 */
export async function addBrokerLeadNote(
  id: unknown,
  body: unknown,
): Promise<LeadActionResult> {
  await requireBroker();

  if (!validLeadId(id)) {
    return {
      ok: false,
      kind: "validation",
      message: "Enter a valid lead ID.",
      fields: { id: "Enter a valid lead ID." },
    };
  }

  if (typeof body !== "string") {
    return {
      ok: false,
      kind: "validation",
      message: "Enter a note before saving.",
      fields: { body: "Enter a note before saving." },
    };
  }

  const noteBody = body.trim();
  if (noteBody.length === 0) {
    return {
      ok: false,
      kind: "validation",
      message: "Enter a note before saving.",
      fields: { body: "Enter a note before saving." },
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: readError } = await supabase
      .from("leads")
      .select("id,is_demo")
      .eq("id", id)
      .maybeSingle();

    if (readError) return databaseError(readError);
    if (data === null) {
      return { ok: false, kind: "not-found", message: "Lead not found." };
    }

    const existing = data as unknown as Pick<LeadWriteRow, "id" | "is_demo">;
    if (existing.is_demo) {
      return {
        ok: false,
        kind: "demo",
        message: "Seeded demo enquiries are read-only.",
      };
    }

    const { error: noteError } = await supabase
      .from("lead_notes")
      .insert({ lead_id: id, body: noteBody });

    if (noteError) return databaseError(noteError);

    const activity = {
      id: randomUUID(),
      lead_id: id,
      occurred_at: new Date().toISOString(),
      label: "Internal note added",
      detail: "A broker note was added.",
    };
    const { error: activityError } = await supabase
      .from("lead_activities")
      .insert(activity);

    let warning: string | undefined;
    if (activityError) {
      warning = "Note saved, but the activity entry could not be logged.";
    }

    if (!revalidateLeadPages() && !warning) {
      warning = "Note saved, but some pages could not be refreshed.";
    }

    return { ok: true, id, changed: true, ...(warning ? { warning } : {}) };
  } catch {
    return databaseError(null);
  }
}
