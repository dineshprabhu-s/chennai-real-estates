"use client";

import { useEffect } from "react";

/**
 * Prevents background scrolling while a mobile navigation panel is open and
 * restores the previous value when it closes or unmounts.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}
