"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import TimePicker from "@/components/ui/TimePicker";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { CalendarClock, MapPin, Loader2, Sparkles, CalendarRange, CheckCircle2, Pencil, Trash2, X, Check, CalendarDays } from "lucide-react";

const CALENDAR_CLASSNAMES = {
  root: "w-full",
  months: "relative flex flex-col gap-4",
  month: "flex w-full flex-col gap-4",
  nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2",
  button_previous: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover",
  button_next: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover",
  month_caption: "flex h-8 w-full items-center justify-center px-4 text-zik-text font-medium",
  weekday: "text-zik-muted text-[0.9rem] font-medium",
  day: "h-8 w-8 text-[0.9rem] font-medium text-zik-text hover:bg-zik-card-hover rounded-md",
  day_selected: "bg-zik-purple text-white hover:bg-zik-purple/90",
  day_today: "bg-zik-purple/10 text-zik-text border border-zik-purple/30 rounded-md",
};

function DateButton({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline"
          className={cn(
            "w-full h-9 justify-start text-left font-normal bg-zik-card border-zik-border text-zik-text hover:bg-zik-card-hover gap-2",
            !value && "text-zik-muted"
          )}
        >
          <CalendarDays className="h-4 w-4 text-zik-purple shrink-0" />
          {value ? format(parseDateStr(value), "PPP", { locale: fr }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-zik-card border-zik-border shadow-lg" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={value ? parseDateStr(value) : undefined}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const day = String(selectedDate.getDate()).padStart(2, "0");
              onChange(`${y}-${m}-${day}`);
            }
          }}
          locale={fr}
          initialFocus
          classNames={CALENDAR_CLASSNAMES}
        />
      </PopoverContent>
    </Popover>
  );
}

type Mode = "disponibilite" | "indisponibilite";
type PeriodKey = "matin" | "apres_midi" | "soir";

interface Rehearsal {
  id: string;
  title: string | null;
  start_time: string;
  location: string | null;
}

interface Pref { user_id: string; mode: string; submitted_week_start: string | null; }
interface Mark { user_id: string; date: string; period: string; }

interface RehearsalTabProps {
  groupId: string;
  currentUserId: string | null;
  isMember: boolean;
  isAdmin: boolean;
  memberCount: number;
}

const PERIODS: { key: PeriodKey; label: string; defaultTime: string }[] = [
  { key: "matin", label: "Matin", defaultTime: "10:00" },
  { key: "apres_midi", label: "Après-midi", defaultTime: "14:00" },
  { key: "soir", label: "Soir", defaultTime: "19:00" },
];

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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

  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [weekPickerValue, setWeekPickerValue] = useState("");
  const [isSavingWeek, setIsSavingWeek] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = weekStart ? parseDateStr(weekStart) : new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const [upcoming, setUpcoming] = useState<Rehearsal[]>([]);
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCellKey, setSelectedCellKey] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planHour, setPlanHour] = useState("");
  const [planLocation, setPlanLocation] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);

  const [forceEdit, setForceEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => { setForceEdit(false); }, [weekStart]);

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

    const { data: groupData } = await supabase
      .from("groups")
      .select("schedule_week_start")
      .eq("id", groupId)
      .single();
    setWeekStart(groupData?.schedule_week_start ?? null);

    const { data: prefsData } = await supabase
      .from("group_schedule_prefs")
      .select("user_id, mode, submitted_week_start")
      .eq("group_id", groupId);
    setPrefs(prefsData ?? []);

    const rangeDays = Array.from({ length: 7 }, (_, i) => {
      const d = groupData?.schedule_week_start ? parseDateStr(groupData.schedule_week_start) : new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return d;
    });
    const { data: marksData } = await supabase
      .from("group_schedule_marks")
      .select("user_id, date, period")
      .eq("group_id", groupId)
      .gte("date", toDateStr(rangeDays[0]))
      .lte("date", toDateStr(rangeDays[6]));
    setMarks(marksData ?? []);

    setIsLoading(false);
  }, [groupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const myPref = prefs.find((p) => p.user_id === currentUserId);
  const myMode: Mode = (myPref?.mode as Mode) ?? "disponibilite";
  const currentWeekKey = toDateStr(days[0]);
  const isSubmitted = myPref?.submitted_week_start === currentWeekKey;
  const showEditor = !isSubmitted || forceEdit;

  const isMarked = (userId: string, date: string, period: string) =>
    marks.some((m) => m.user_id === userId && m.date === date && m.period === period);

  const modeOf = (userId: string): Mode | null => {
    const p = prefs.find((pr) => pr.user_id === userId);
    return p ? (p.mode as Mode) : null;
  };

  const isAvailable = (userId: string, date: string, period: string): boolean | null => {
    const mode = modeOf(userId);
    if (!mode) return null;
    const marked = isMarked(userId, date, period);
    return mode === "disponibilite" ? marked : !marked;
  };

  const currentWeekMarkedUserIds = new Set(marks.map((m) => m.user_id));
  const participantIds = prefs
    .filter((p) => p.submitted_week_start === currentWeekKey || currentWeekMarkedUserIds.has(p.user_id))
    .map((p) => p.user_id);

  const tally = (date: string, period: string) =>
    participantIds.filter((uid) => isAvailable(uid, date, period) === true).length;

  const cellScores = days.flatMap((d) => PERIODS.map((p) => tally(toDateStr(d), p.key)));
  const bestScore = cellScores.length > 0 ? Math.max(...cellScores) : 0;

  const handleModeChange = async (mode: Mode) => {
    if (!currentUserId || !showEditor || mode === myMode) return;
    await supabase.from("group_schedule_prefs")
      .upsert({ group_id: groupId, user_id: currentUserId, mode, updated_at: new Date().toISOString() }, { onConflict: "group_id,user_id" });
    await supabase.from("group_schedule_marks").delete().eq("group_id", groupId).eq("user_id", currentUserId);
    await fetchAll();
  };

  const handleSetWeek = async () => {
    if (!weekPickerValue) return;
    setIsSavingWeek(true);
    await supabase.from("groups").update({ schedule_week_start: weekPickerValue }).eq("id", groupId);

    const { data: membersData } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("status", "confirmed");
    const weekLabel = `${parseDateStr(weekPickerValue).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${
      (() => { const end = parseDateStr(weekPickerValue); end.setDate(end.getDate() + 6); return end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); })()
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

    setIsSavingWeek(false);
    setWeekPickerValue("");
    await fetchAll();
  };

  const applyWeekdayOfficePattern = async () => {
    if (!currentUserId || !showEditor) return;
    if (myMode !== "indisponibilite") {
      await supabase.from("group_schedule_prefs")
        .upsert({ group_id: groupId, user_id: currentUserId, mode: "indisponibilite", updated_at: new Date().toISOString() }, { onConflict: "group_id,user_id" });
      await supabase.from("group_schedule_marks").delete().eq("group_id", groupId).eq("user_id", currentUserId);
    }
    const officeCells = days
      .filter((d) => { const wd = d.getDay(); return wd >= 1 && wd <= 5; })
      .flatMap((d) => (["matin", "apres_midi"] as PeriodKey[]).map((period) => ({ date: toDateStr(d), period })));
    await supabase.from("group_schedule_marks").upsert(
      officeCells.map((c) => ({ group_id: groupId, user_id: currentUserId, date: c.date, period: c.period })),
      { onConflict: "group_id,user_id,date,period" }
    );
    await fetchAll();
  };

  const handleValidate = async () => {
    if (!currentUserId) return;
    setIsSubmitting(true);
    await supabase.from("group_schedule_prefs").upsert({
      group_id: groupId, user_id: currentUserId, mode: myMode,
      submitted_week_start: currentWeekKey, submitted_at: new Date().toISOString(),
    }, { onConflict: "group_id,user_id" });
    setIsSubmitting(false);
    setForceEdit(false);
    await fetchAll();
  };

  const toggleCell = async (date: string, period: string) => {
    if (!currentUserId || !showEditor) return;
    const marked = isMarked(currentUserId, date, period);
    if (marked) {
      await supabase.from("group_schedule_marks").delete()
        .eq("group_id", groupId).eq("user_id", currentUserId).eq("date", date).eq("period", period);
    } else {
      await supabase.from("group_schedule_prefs")
        .upsert({ group_id: groupId, user_id: currentUserId, mode: myMode }, { onConflict: "group_id,user_id" });
      await supabase.from("group_schedule_marks").insert({ group_id: groupId, user_id: currentUserId, date, period });
    }
    await fetchAll();
  };

  const cellOptions = days.flatMap((d) => {
    const dateStr = toDateStr(d);
    return PERIODS.map((p) => ({
      key: `${dateStr}_${p.key}`,
      dateStr,
      period: p,
      label: `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · ${p.label}`,
      count: tally(dateStr, p.key),
    }));
  }).sort((a, b) => b.count - a.count);

  const handleSelectCell = (key: string) => {
    setSelectedCellKey(key);
    const opt = cellOptions.find((o) => o.key === key);
    if (opt) { setPlanDate(opt.dateStr); setPlanHour(opt.period.defaultTime); }
  };

  const handlePlanRehearsal = async () => {
    if (!planDate || !planHour) return;
    setIsPlanning(true);
    await supabase.from("group_rehearsals").insert({
      group_id: groupId, start_time: new Date(`${planDate}T${planHour}`).toISOString(),
      location: planLocation.trim() || null, created_by: currentUserId,
    });
    setIsPlanning(false);
    setSelectedCellKey("");
    setPlanDate("");
    setPlanHour("");
    setPlanLocation("");
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
        <h3 className="text-xs font-semibold text-zik-muted uppercase tracking-wide mb-2">Trouver un créneau commun</h3>
        <p className="text-sm text-zik-text font-medium mb-1 flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 text-zik-purple" />
          Semaine du {days[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au {days[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </p>
        <p className="text-xs text-zik-muted mb-2">
          {participantIds.length}/{memberCount} membre{memberCount > 1 ? "s" : ""} ont indiqué leur planning
        </p>

        {isAdmin && (
          <div className="flex gap-1.5 mb-3 items-start">
            <div className="flex-1">
              <DateButton value={weekPickerValue} onChange={setWeekPickerValue} placeholder="Choisir une semaine..." />
            </div>
            <Button
              size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo shrink-0 h-9"
              disabled={!weekPickerValue || isSavingWeek}
              onClick={handleSetWeek}
            >
              {isSavingWeek ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Demander"}
            </Button>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <button type="button" disabled={!showEditor} onClick={() => handleModeChange("disponibilite")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors disabled:opacity-50 ${
              myMode === "disponibilite" ? "bg-zik-purple/10 border-zik-purple/40 text-zik-purple" : "border-zik-border text-zik-muted"
            }`}>
            ✅ Je remplis mes dispos
          </button>
          <button type="button" disabled={!showEditor} onClick={() => handleModeChange("indisponibilite")}
            className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors disabled:opacity-50 ${
              myMode === "indisponibilite" ? "bg-zik-purple/10 border-zik-purple/40 text-zik-purple" : "border-zik-border text-zik-muted"
            }`}>
            🚫 Je remplis mes indispos
          </button>
        </div>
        <p className="text-[11px] text-zik-muted mb-2">
          {myMode === "disponibilite"
            ? "Coche les cases où tu es disponible."
            : "Coche les cases où tu n'es PAS disponible."}
        </p>
        {showEditor && (
          <button type="button" onClick={applyWeekdayOfficePattern}
            className="text-[11px] text-zik-purple font-medium mb-3 hover:underline">
            🏢 Indispo en semaine, matin + après-midi (Lun-Ven)
          </button>
        )}

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="border-collapse text-xs mx-auto" style={{ minWidth: 380 }}>
            <thead>
              <tr>
                <th className="w-14" />
                {days.map((d) => (
                  <th key={toDateStr(d)} className="text-center font-medium text-zik-text pb-1.5 px-0.5">
                    <div className="text-[9px] text-zik-muted uppercase">
                      {d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                    </div>
                    <div>{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period.key}>
                  <td className="text-[11px] text-zik-muted pr-1.5 whitespace-nowrap">{period.label}</td>
                  {days.map((d) => {
                    const dateStr = toDateStr(d);
                    const count = tally(dateStr, period.key);
                    const mine = currentUserId ? isMarked(currentUserId, dateStr, period.key) : false;
                    const isBest = bestScore > 0 && count === bestScore;
                    return (
                      <td key={dateStr} className="p-0.5">
                        <button
                          onClick={() => toggleCell(dateStr, period.key)}
                          disabled={!showEditor}
                          className={`h-8 w-8 rounded-md flex items-center justify-center text-[11px] font-semibold border transition-colors disabled:cursor-default ${
                            mine
                              ? "bg-zik-purple/20 border-zik-purple text-zik-purple"
                              : isBest
                                ? "border-zik-emerald/40 bg-zik-emerald/10 text-zik-emerald"
                                : `border-zik-border text-zik-muted ${showEditor ? "hover:border-zik-purple/30" : ""}`
                          }`}
                        >
                          {count > 0 ? count : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showEditor ? (
          <Button
            size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo w-full mt-3"
            disabled={isSubmitting}
            onClick={handleValidate}
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Valider mes disponibilités"}
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-3 p-2.5 rounded-lg bg-zik-emerald/10 border border-zik-emerald/20">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zik-emerald">
              <CheckCircle2 className="h-3.5 w-3.5" /> Dispo envoyée
            </span>
            <button type="button" onClick={() => setForceEdit(true)}
              className="flex items-center gap-1 text-xs font-medium text-zik-purple hover:underline shrink-0">
              <Pencil className="h-3 w-3" /> Modifier
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="border-t border-zik-border pt-3 mt-4 space-y-2">
            <p className="text-xs font-medium text-zik-text flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-zik-purple" /> Planifier une répétition
            </p>
            <select
              value={selectedCellKey}
              onChange={(e) => handleSelectCell(e.target.value)}
              className="zik-input text-sm"
            >
              <option value="">Choisir un créneau...</option>
              {cellOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label} ({opt.count})</option>
              ))}
            </select>
            {selectedCellKey && (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <DateButton value={planDate} onChange={setPlanDate} placeholder="Date" />
                  <TimePicker value={planHour} onChange={setPlanHour} />
                </div>
                <input
                  value={planLocation}
                  onChange={(e) => setPlanLocation(e.target.value)}
                  placeholder="Lieu (optionnel)"
                  className="zik-input text-sm"
                />
                <Button
                  size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo w-full"
                  disabled={isPlanning || !planDate || !planHour}
                  onClick={handlePlanRehearsal}
                >
                  {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Planifier"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
