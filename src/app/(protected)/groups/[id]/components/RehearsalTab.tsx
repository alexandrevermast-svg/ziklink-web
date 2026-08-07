"use client";

import { useCallback, useEffect, useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import TimePicker from "@/components/ui/TimePicker";
import { createClient } from "@/lib/supabase/client";
import { DateButton, parseDateStr } from "./DateButton";
import { ScheduleRequestCard } from "./ScheduleRequestCard";
import { CalendarClock, MapPin, Loader2, Pencil, Trash2, X, Check, Plus } from "lucide-react";

interface Rehearsal {
  id: string;
  title: string | null;
  start_time: string;
  location: string | null;
}

interface ScheduleRequest {
  id: string;
  week_start: string;
  created_by: string | null;
  creator: { username: string | null } | null;
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

function toDateAndHour(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, hour: `${h}:${min}` };
}

export function RehearsalTab({ groupId, currentUserId, isMember, isAdmin, memberCount }: RehearsalTabProps) {
  const supabase = createClient();

  const [upcoming, setUpcoming] = useState<Rehearsal[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [newRequestWeek, setNewRequestWeek] = useState("");
  const [isSavingRequest, setIsSavingRequest] = useState(false);

  const [editingRehearsalId, setEditingRehearsalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHour, setEditHour] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSavingRehearsal, setIsSavingRehearsal] = useState(false);

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

    const { data: reqData, error: reqError } = await supabase
      .from("group_schedule_requests")
      .select("id, week_start, created_by, creator:profiles!group_schedule_requests_created_by_fkey(username)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (reqError) console.error(`group_schedule_requests fetch failed: ${reqError.message} (code: ${reqError.code}, hint: ${reqError.hint})`);
    setRequests((reqData ?? []).map((r: any) => ({ ...r, creator: r.creator ?? null })));

    setIsLoading(false);
  }, [groupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateRequest = async () => {
    if (!newRequestWeek || !currentUserId) return;
    setIsSavingRequest(true);
    const { data: reqRow } = await supabase
      .from("group_schedule_requests")
      .insert({ group_id: groupId, week_start: newRequestWeek, created_by: currentUserId })
      .select("id")
      .single();

    if (reqRow) {
      const { data: membersData } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .eq("status", "confirmed");
      const weekLabel = `${parseDateStr(newRequestWeek).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${
        (() => { const end = parseDateStr(newRequestWeek); end.setDate(end.getDate() + 6); return end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); })()
      }`;
      const recipients = (membersData ?? [])
        .map((m) => m.user_id)
        .filter((uid): uid is string => !!uid && uid !== currentUserId);
      for (const uid of recipients) {
        await supabase.from("notifications").insert({
          user_id: uid,
          type: "rehearsal_schedule",
          title: "Nouveau planning à remplir 🗓️",
          body: `Indique tes disponibilités pour la semaine du ${weekLabel}`,
          link: `/groups/${groupId}`,
        });
      }
    }

    setIsSavingRequest(false);
    setIsCreatingRequest(false);
    setNewRequestWeek("");
    await fetchAll();
  };

  const handleStartEditRehearsal = (r: Rehearsal) => {
    const { date, hour } = toDateAndHour(r.start_time);
    setEditingRehearsalId(r.id);
    setEditTitle(r.title ?? "");
    setEditDate(date);
    setEditHour(hour);
    setEditLocation(r.location ?? "");
  };

  const handleCancelEditRehearsal = () => {
    setEditingRehearsalId(null);
    setEditTitle("");
    setEditDate("");
    setEditHour("");
    setEditLocation("");
  };

  const handleSaveRehearsal = async () => {
    if (!editingRehearsalId || !editDate || !editHour) return;
    setIsSavingRehearsal(true);
    await supabase.from("group_rehearsals").update({
      title: editTitle.trim() || null,
      start_time: new Date(`${editDate}T${editHour}`).toISOString(),
      location: editLocation.trim() || null,
    }).eq("id", editingRehearsalId);
    setIsSavingRehearsal(false);
    handleCancelEditRehearsal();
    await fetchAll();
  };

  const handleDeleteRehearsal = async (id: string) => {
    if (!confirm("Supprimer cette répétition ?")) return;
    await supabase.from("group_rehearsals").delete().eq("id", id);
    await fetchAll();
  };

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
              editingRehearsalId === r.id ? (
                <div key={r.id} className="p-3 rounded-xl border border-zik-purple/30 bg-zik-card/50 space-y-1.5">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Titre (optionnel)"
                    className="zik-input text-sm"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <DateButton value={editDate} onChange={setEditDate} placeholder="Date" />
                    <TimePicker value={editHour} onChange={setEditHour} />
                  </div>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Lieu (optionnel)"
                    className="zik-input text-sm"
                  />
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      type="button" size="sm" variant="outline"
                      className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                      onClick={handleCancelEditRehearsal}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button" size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo"
                      disabled={isSavingRehearsal || !editDate || !editHour}
                      onClick={handleSaveRehearsal}
                    >
                      {isSavingRehearsal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ) : (
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
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleStartEditRehearsal(r)} className="text-zik-muted hover:text-zik-purple p-1">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteRehearsal(r.id)} className="text-zik-muted hover:text-zik-red p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Trouver un créneau commun */}
      <div className="border-t border-zik-border pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-zik-muted uppercase tracking-wide">Trouver un créneau commun</h3>
          {!isCreatingRequest && (
            <button onClick={() => setIsCreatingRequest(true)}
              className="flex items-center gap-1 text-xs font-medium text-zik-purple hover:underline">
              <Plus className="h-3.5 w-3.5" /> Nouvelle demande
            </button>
          )}
        </div>

        {isCreatingRequest && (
          <div className="rounded-xl border border-zik-border bg-zik-card/50 p-3 mb-3 space-y-2">
            <p className="text-xs text-zik-muted">Pour quelle semaine cherchez-vous un créneau ?</p>
            <div className="flex gap-1.5 items-start">
              <div className="flex-1">
                <DateButton value={newRequestWeek} onChange={setNewRequestWeek} placeholder="Choisir une semaine..." />
              </div>
              <Button
                size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo shrink-0 h-9"
                disabled={!newRequestWeek || isSavingRequest}
                onClick={handleCreateRequest}
              >
                {isSavingRequest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Créer"}
              </Button>
              <Button
                size="sm" variant="outline" className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover shrink-0 h-9"
                onClick={() => { setIsCreatingRequest(false); setNewRequestWeek(""); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {requests.length === 0 && !isCreatingRequest ? (
          <p className="text-sm text-zik-muted py-2">Aucune demande de créneau en cours.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <ScheduleRequestCard
                key={r.id}
                requestId={r.id}
                groupId={groupId}
                weekStart={r.week_start}
                creatorUsername={r.creator?.username ?? null}
                canManage={isAdmin || r.created_by === currentUserId}
                currentUserId={currentUserId}
                memberCount={memberCount}
                onResolved={fetchAll}
                onCancel={fetchAll}
              />
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
