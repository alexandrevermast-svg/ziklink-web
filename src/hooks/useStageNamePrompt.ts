"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Avant de rejoindre une jam, s'assure que l'utilisateur a un nom affiché
// (prénom / nom de scène) sur son profil — plus pratique à utiliser qu'un
// pseudo pendant une jam en vrai. Demandé une seule fois : une fois
// enregistré, il est réutilisé pour toutes les jams suivantes.
export function useStageNamePrompt() {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const resolverRef = useRef<((name: string | null) => void) | null>(null);

  // Résout avec le nom affiché existant, ou ouvre la modale et résout avec
  // le nom saisi (ou null si l'utilisateur annule).
  const ensureStageName = useCallback(async (userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (data?.display_name?.trim()) return data.display_name;

    userIdRef.current = userId;
    setValue("");
    setIsOpen(true);
    return new Promise<string | null>((resolve) => { resolverRef.current = resolve; });
  }, [supabase]);

  const handleSubmit = useCallback(async () => {
    const userId = userIdRef.current;
    const trimmed = value.trim();
    if (!userId || !trimmed) return;
    setIsSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", userId);
    setIsSaving(false);
    if (error) return;
    setIsOpen(false);
    resolverRef.current?.(trimmed);
    resolverRef.current = null;
  }, [value, supabase]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);

  return { isOpen, value, setValue, isSaving, ensureStageName, handleSubmit, handleCancel };
}
