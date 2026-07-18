"use client";

import { useEffect, useRef } from "react";

export function useFocusReturn(enabled = true) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const target = previousFocus.current;
      if (target && document.contains(target)) window.setTimeout(() => target.focus(), 0);
    };
  }, [enabled]);
}
