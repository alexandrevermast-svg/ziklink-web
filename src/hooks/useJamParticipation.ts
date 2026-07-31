"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Mutation partagée pour rejoindre/quitter une jam — utilisée par la home,
// la liste des jams et la page de détail, qui composent chacune leurs propres
// effets de bord (refetch, redirection login, ajout à la conversation...).
export function useJamParticipation() {
  const supabase = createClient();
  const [pendingJamId, setPendingJamId] = useState<string | null>(null);

  // status omis => la valeur par défaut de la colonne en base s'applique (comportement de JamList.tsx).
  const joinJam = useCallback(async (jamId: string, userId: string, status?: string) => {
    setPendingJamId(jamId);
    const { error } = await supabase
      .from("jam_participants")
      .insert({ jam_id: jamId, user_id: userId, ...(status ? { status } : {}) });
    setPendingJamId(null);
    return { error };
  }, [supabase]);

  const leaveJam = useCallback(async (jamId: string, userId: string) => {
    setPendingJamId(jamId);
    const { error } = await supabase
      .from("jam_participants")
      .delete()
      .eq("jam_id", jamId)
      .eq("user_id", userId);
    setPendingJamId(null);
    return { error };
  }, [supabase]);

  return { joinJam, leaveJam, pendingJamId };
}
