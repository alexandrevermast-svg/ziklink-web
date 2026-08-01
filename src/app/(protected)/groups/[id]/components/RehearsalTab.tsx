"use client";

import { useCallback, useEffect, useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CalendarClock, MapPin, Plus, X, Check, Loader2, Sparkles } from "lucide-react";

interface Rehearsal {
  id: string;
  title: string | null;
  start_time: string;
  location: string | null;
}

interface PollSlot {
  id: string;
  start_time: string;
}

interface Poll {
  id: string;
  title: string | null;
  mode: "disponibilite" | "indisponibilite";
  created_by: string | null;
}

interface ResponseRow {
  slot_id: string;
  user_id: string;
}

interface RehearsalTabProps {
  groupId: string;
  currentUserId: string | null;
  isMember: boolean;
  isAdmin: boolean;
  memberCount: number;
}

function formatSlot(d: string) {
  return new Date(d).toLocaleString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function RehearsalTab({ groupId, currentUserId, isMember, isAdmin, memberCount }: RehearsalTabProps) {
  const supabase = createClient();

  const [upcoming, setUpcoming] = useState<Rehearsal[]>([]);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [slots, setSlots] = useState<PollSlot[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newMode, setNewMode] = useState<"disponibilite" | "indisponibilite">("disponibilite");
  const [newTitle, setNewTitle] = useState("");
  const [candidateInputs, setCandidateInputs] = useState<string[]>([""]);
  const [isSavingPoll, setIsSavingPoll] = useState(false);

  const [confirmingSlotId, setConfirmingSlotId] = useState<string | null>(null);
  const [confirmLocation, setConfirmLocation] = useState("");

  const fetchAll = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const { data: rehData } = await supabase
      .from("group_rehearsals")
      .select("id, title, start_time, location")
      .eq("group_id", groupId)
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(2);
    setUpcoming(rehData ?? []);

    const { data: pollData } = await supabase
      .from("group_availability_polls")
      .select("id, title, mode, created_by")
      .eq("group_id", groupId)
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPoll(pollData as Poll | null);

    if (pollData) {
      const { data: slotData } = await supabase
        .from("group_availability_slots")
        .select("id, start_time")
        .eq("poll_id", pollData.id)
        .order("start_time", { ascending: true });
      setSlots(slotData ?? []);

      const slotIds = (slotData ?? []).map((s) => s.id);
      if (slotIds.length > 0) {
        const { data: respData } = await supabase
          .from("group_availability_responses")
          .select("slot_id, user_id")
          .in("slot_id", slotIds);
        setResponses(respData ?? []);
      } else {
        setResponses([]);
      }
    } else {
      setSlots([]);
      setResponses([]);
    }
    setIsLoading(false);
  }, [groupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addCandidateInput = () => setCandidateInputs((prev) => [...prev, ""]);
  const updateCandidateInput = (i: number, v: string) =>
    setCandidateInputs((prev) => prev.map((c, idx) => (idx === i ? v : c)));
  const removeCandidateInput = (i: number) =>
    setCandidateInputs((prev) => prev.filter((_, idx) => idx !== i));

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewTitle("");
    setNewMode("disponibilite");
    setCandidateInputs([""]);
  };

  const handleCreatePoll = async () => {
    if (!currentUserId) return;
    const validSlots = candidateInputs.filter((c) => c.trim());
    if (validSlots.length === 0) return;
    setIsSavingPoll(true);
    const { data: pollRow, error } = await supabase
      .from("group_availability_polls")
      .insert({ group_id: groupId, title: newTitle.trim() || null, mode: newMode, created_by: currentUserId })
      .select("id")
      .single();
    if (!error && pollRow) {
      await supabase.from("group_availability_slots").insert(
        validSlots.map((s) => ({ poll_id: pollRow.id, start_time: new Date(s).toISOString() }))
      );
    }
    setIsSavingPoll(false);
    resetCreateForm();
    await fetchAll();
  };

  const handleDeletePoll = async () => {
    if (!poll) return;
    await supabase.from("group_availability_polls").delete().eq("id", poll.id);
    await fetchAll();
  };

  const myResponseSlotIds = new Set(
    responses.filter((r) => r.user_id === currentUserId).map((r) => r.slot_id)
  );

  const toggleMyResponse = async (slotId: string) => {
    if (!currentUserId) return;
    if (myResponseSlotIds.has(slotId)) {
      await supabase.from("group_availability_responses").delete().eq("slot_id", slotId).eq("user_id", currentUserId);
    } else {
      await supabase.from("group_availability_responses").insert({ slot_id: slotId, user_id: currentUserId });
    }
    await fetchAll();
  };

  const countForSlot = (slotId: string) => responses.filter((r) => r.slot_id === slotId).length;

  const handleConfirmSlot = async (slot: PollSlot) => {
    if (!poll) return;
    setIsSavingPoll(true);
    await supabase.from("group_rehearsals").insert({
      group_id: groupId, title: poll.title, start_time: slot.start_time,
      location: confirmLocation.trim() || null, created_by: currentUserId,
    });
    await supabase.from("group_availability_polls")
      .update({ resolved_slot_id: slot.id, resolved_at: new Date().toISOString() })
      .eq("id", poll.id);
    setIsSavingPoll(false);
    setConfirmingSlotId(null);
    setConfirmLocation("");
    await fetchAll();
  };

  const canManagePoll = !!poll && (isAdmin || poll.created_by === currentUserId);
  const scores = slots.map((s) => countForSlot(s.id));
  const bestScore = scores.length > 0
    ? (poll?.mode === "disponibilite" ? Math.max(...scores) : Math.min(...scores))
    : null;

  if (isLoading) {
    return (
      <TabsContent value="repetition" className="px-4 py-3">
        <div className="h-24 bg-zik-card animate-pulse rounded-xl" />
      </TabsContent>
    );
  }

  if (!isMember) {
    return (
      <TabsContent value="repetition" className="px-4 py-8">
        <p className="text-sm text-zik-muted text-center">Rejoins le groupe pour voir les répétitions 🥁</p>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="repetition" className="px-4 py-3 space-y-5">
      {/* Prochaines répétitions */}
      <div>
        <h3 className="text-xs font-semibold text-zik-muted uppercase tracking-wide mb-2">Prochaines répétitions</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zik-muted py-2">Aucune répétition planifiée pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 p-3 rounded-xl border border-zik-border bg-zik-card/50">
                <CalendarClock className="h-4 w-4 text-zik-purple shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zik-text truncate">{r.title || "Répétition"}</p>
                  <p className="text-xs text-zik-muted">{formatSlot(r.start_time)}</p>
                </div>
                {r.location && (
                  <span className="flex items-center gap-1 text-xs text-zik-muted shrink-0 max-w-32 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {r.location}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trouver un créneau commun */}
      <div className="border-t border-zik-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-zik-muted uppercase tracking-wide">Trouver un créneau commun</h3>
          {!poll && !isCreating && (
            <button onClick={() => setIsCreating(true)} className="flex items-center gap-1 text-xs text-zik-purple font-medium hover:underline">
              <Plus className="h-3.5 w-3.5" /> Nouveau sondage
            </button>
          )}
        </div>

        {!poll && !isCreating && (
          <p className="text-sm text-zik-muted py-2">
            Aucun sondage en cours. Propose des créneaux pour trouver quand tout le monde est dispo.
          </p>
        )}

        {isCreating && (
          <div className="p-3 rounded-xl border border-zik-border bg-zik-card/50 space-y-3">
            <div>
              <label className="text-xs font-medium text-zik-muted mb-1 block">Titre (optionnel)</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Répète avant le concert"
                className="zik-input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zik-muted mb-1.5 block">Les membres indiqueront...</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewMode("disponibilite")}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                    newMode === "disponibilite" ? "bg-zik-purple/10 border-zik-purple/40 text-zik-purple" : "border-zik-border text-zik-muted"
                  }`}>
                  ✅ Leurs disponibilités
                </button>
                <button type="button" onClick={() => setNewMode("indisponibilite")}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                    newMode === "indisponibilite" ? "bg-zik-purple/10 border-zik-purple/40 text-zik-purple" : "border-zik-border text-zik-muted"
                  }`}>
                  🚫 Leurs indisponibilités
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zik-muted mb-1.5 block">Créneaux proposés</label>
              <div className="space-y-2">
                {candidateInputs.map((c, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      type="datetime-local"
                      value={c}
                      onChange={(e) => updateCandidateInput(i, e.target.value)}
                      className="zik-input text-sm flex-1"
                    />
                    {candidateInputs.length > 1 && (
                      <button type="button" onClick={() => removeCandidateInput(i)} className="text-zik-muted hover:text-zik-red px-1">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addCandidateInput} className="flex items-center gap-1 text-xs text-zik-purple font-medium mt-2 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Ajouter un créneau
              </button>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover" onClick={resetCreateForm}>
                Annuler
              </Button>
              <Button
                type="button" size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo"
                disabled={isSavingPoll || candidateInputs.every((c) => !c.trim())}
                onClick={handleCreatePoll}
              >
                {isSavingPoll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Créer le sondage"}
              </Button>
            </div>
          </div>
        )}

        {poll && (
          <div className="p-3 rounded-xl border border-zik-border bg-zik-card/50 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zik-text">{poll.title || "Sondage de disponibilité"}</p>
                <p className="text-xs text-zik-muted mt-0.5">
                  {poll.mode === "disponibilite" ? "Coche les créneaux où tu es dispo" : "Coche les créneaux où tu n'es PAS dispo"}
                </p>
              </div>
              {canManagePoll && (
                <button onClick={handleDeletePoll} className="text-zik-muted hover:text-zik-red shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {slots.map((slot) => {
                const count = countForSlot(slot.id);
                const isChecked = myResponseSlotIds.has(slot.id);
                const isBest = slots.length > 1 && bestScore !== null && count === bestScore
                  && (poll.mode === "indisponibilite" || count > 0);
                return (
                  <div key={slot.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                    isBest ? "border-zik-emerald/40 bg-zik-emerald/5" : "border-zik-border"
                  }`}>
                    <button onClick={() => toggleMyResponse(slot.id)}
                      className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                        isChecked ? "bg-zik-purple border-zik-purple text-white" : "border-zik-border text-transparent hover:border-zik-purple/50"
                      }`}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zik-text">{formatSlot(slot.start_time)}</p>
                    </div>
                    <span className="text-xs text-zik-muted shrink-0">{count}/{memberCount}</span>
                    {isBest && <Sparkles className="h-3.5 w-3.5 text-zik-emerald shrink-0" />}
                    {canManagePoll && (
                      confirmingSlotId === slot.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            value={confirmLocation}
                            onChange={(e) => setConfirmLocation(e.target.value)}
                            placeholder="Lieu (optionnel)"
                            className="zik-input text-xs w-28 py-1"
                          />
                          <button onClick={() => handleConfirmSlot(slot)} disabled={isSavingPoll} className="text-zik-emerald hover:bg-zik-emerald/10 rounded p-1">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setConfirmingSlotId(null)} className="text-zik-muted hover:text-zik-red rounded p-1">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmingSlotId(slot.id)} className="text-xs text-zik-purple font-medium shrink-0 hover:underline">
                          Choisir
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  );
}
