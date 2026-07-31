"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Marquer/retirer son intérêt pour une jam (jam_interested) — indépendant de
// l'inscription (jam_participants), comme "intéressé" sur les concerts.
export function useJamInterest() {
  const supabase = createClient();
  const [pendingJamId, setPendingJamId] = useState<string | null>(null);

  const markInterested = useCallback(async (jamId: string, userId: string) => {
    setPendingJamId(jamId);
    const { error } = await supabase
      .from("jam_interested")
      .insert({ jam_id: jamId, user_id: userId });
    setPendingJamId(null);
    return { error };
  }, [supabase]);

  const unmarkInterested = useCallback(async (jamId: string, userId: string) => {
    setPendingJamId(jamId);
    const { error } = await supabase
      .from("jam_interested")
      .delete()
      .eq("jam_id", jamId)
      .eq("user_id", userId);
    setPendingJamId(null);
    return { error };
  }, [supabase]);

  return { markInterested, unmarkInterested, pendingJamId };
}
