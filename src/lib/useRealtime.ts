"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/designs";
/**
 * Light realtime subscription for admin tables. Postgres Changes feed a
 * "version" counter; the caller refetches. Kept deliberately simple: on
 * failure the listener silently stays at the last fetched snapshot (the
 * panels also refetch on focus/tab-switch).
 */
export function useRealtimeVersion(table: string, enabled: boolean): number {
  const [version, setVersion] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ch = supabaseClient()
      .channel(`whimlet-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => setVersion((v) => v + 1))
      .subscribe();
    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [table, enabled]);

  return version;
}
