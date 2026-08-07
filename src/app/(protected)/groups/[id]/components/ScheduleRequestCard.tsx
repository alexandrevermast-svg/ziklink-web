"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import TimePicker from "@/components/ui/TimePicker";
import { createClient } from "@/lib/supabase/client";
import { DateButton, parseDateStr, toDateStr } from "./DateButton";
import { Loader2, Sparkles, CalendarRange, CheckCircle2, Pencil, X } from "lucide-react";

type Mode = "disponibilite" | "indisponibilite";
type PeriodKey = "matin" | "apres_midi" | "soir";

interface Pref { user_id: string; mode: string; submitted_at: string | null; }
interface Mark { user_id: string; date: string; period: string; }

interface ScheduleRequestCardProps {
  requestId: string;
  groupId: string;
  weekStart: string;
  creatorUsername: string | null;
  canManage: boolean;
  currentUserId: string | null;
  memberCount: number;
  onResolved: () => void;
  onCancel: () => void;
}

const PERIODS: { key: PeriodKey; label: string; defaultTime: string }[] = [
  { key: "matin", label: "Matin", defaultTime: "10:00" },
  { key: "apres_midi", label: "Après-midi", defaultTime: "14:00" },
  { key: "soir", label: "Soir", defaultTime: "19:00" },
];

export function ScheduleRequestCard({
  requestId, groupId, weekStart, creatorUsername, canManage,
  currentUserId, memberCount, onResolved, onCancel,
}: ScheduleRequestCardProps) {
  const supabase = createClient();

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = parseDateStr(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forceEdit, setForceEdit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCellKey, setSelectedCellKey] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planHour, setPlanHour] = useState("");
  const [planLocation, setPlanLocation] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchAll = useCallback(async () => {
    const { data: prefsData } = await supabase
      .from("group_schedule_prefs")
      .select("user_id, mode, submitted_at")
      .eq("request_id", requestId);
    setPrefs(prefsData ?? []);

    const { data: marksData } = await supabase
      .from("group_schedule_marks")
      .select("user_id, date, period")
      .eq("request_id", requestId);
    setMarks(marksData ?? []);

    setIsLoading(false);
  }, [requestId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const myPref = prefs.find((p) => p.user_id === currentUserId);
  const myMode: Mode = (myPref?.mode as Mode) ?? "disponibilite";
  const isSubmitted = !!myPref?.submitted_at;
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

  const participantIds = Array.from(new Set(prefs.map((p) => p.user_id)));

  const tally = (date: string, period: string) =>
    participantIds.filter((uid) => isAvailable(uid, date, period) === true).length;

  const cellScores = days.flatMap((d) => PERIODS.map((p) => tally(toDateStr(d), p.key)));
  const bestScore = cellScores.length > 0 ? Math.max(...cellScores) : 0;

  const handleModeChange = async (mode: Mode) => {
    if (!currentUserId || !showEditor || mode === myMode) return;
    await supabase.from("group_schedule_prefs")
      .upsert({ request_id: requestId, user_id: currentUserId, mode, updated_at: new Date().toISOString() }, { onConflict: "request_id,user_id" });
    await supabase.from("group_schedule_marks").delete().eq("request_id", requestId).eq("user_id", currentUserId);
    await fetchAll();
  };

  const applyWeekdayOfficePattern = async () => {
    if (!currentUserId || !showEditor) return;
    if (myMode !== "indisponibilite") {
      await supabase.from("group_schedule_prefs")
        .upsert({ request_id: requestId, user_id: currentUserId, mode: "indisponibilite", updated_at: new Date().toISOString() }, { onConflict: "request_id,user_id" });
      await supabase.from("group_schedule_marks").delete().eq("request_id", requestId).eq("user_id", currentUserId);
    }
    const officeCells = days
      .filter((d) => { const wd = d.getDay(); return wd >= 1 && wd <= 5; })
      .flatMap((d) => (["matin", "apres_midi"] as PeriodKey[]).map((period) => ({ date: toDateStr(d), period })));
    await supabase.from("group_schedule_marks").upsert(
      officeCells.map((c) => ({ request_id: requestId, user_id: currentUserId, date: c.date, period: c.period })),
      { onConflict: "request_id,user_id,date,period" }
    );
    await fetchAll();
  };

  const handleValidate = async () => {
    if (!currentUserId) return;
    setIsSubmitting(true);
    await supabase.from("group_schedule_prefs").upsert({
      request_id: requestId, user_id: currentUserId, mode: myMode, submitted_at: new Date().toISOString(),
    }, { onConflict: "request_id,user_id" });
    setIsSubmitting(false);
    setForceEdit(false);
    await fetchAll();
  };

  const toggleCell = async (date: string, period: string) => {
    if (!currentUserId || !showEditor) return;
    const marked = isMarked(currentUserId, date, period);
    if (marked) {
      await supabase.from("group_schedule_marks").delete()
        .eq("request_id", requestId).eq("user_id", currentUserId).eq("date", date).eq("period", period);
    } else {
      await supabase.from("group_schedule_prefs")
        .upsert({ request_id: requestId, user_id: currentUserId, mode: myMode }, { onConflict: "request_id,user_id" });
      await supabase.from("group_schedule_marks").insert({ request_id: requestId, user_id: currentUserId, date, period });
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
    await supabase.from("group_schedule_requests").delete().eq("id", requestId);
    setIsPlanning(false);
    onResolved();
  };

  const handleCancelRequest = async () => {
    if (!confirm("Annuler cette demande de créneau ?")) return;
    setIsCancelling(true);
    await supabase.from("group_schedule_requests").delete().eq("id", requestId);
    setIsCancelling(false);
    onCancel();
  };

  return (
    <div className="rounded-xl border border-zik-border bg-zik-card/50 p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm text-zik-text font-medium flex items-center gap-1.5">
          <CalendarRange className="h-3.5 w-3.5 text-zik-purple shrink-0" />
          Semaine du {days[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au {days[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </p>
        {canManage && (
          <button onClick={handleCancelRequest} disabled={isCancelling}
            className="text-zik-muted hover:text-zik-red transition-colors shrink-0 disabled:opacity-50">
            {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {creatorUsername && (
        <p className="text-xs text-zik-muted mb-2">Demandé par {creatorUsername}</p>
      )}

      {isLoading ? (
        <div className="h-24 bg-zik-card animate-pulse rounded-lg" />
      ) : (
        <>
          <p className="text-xs text-zik-muted mb-2">
            {participantIds.length}/{memberCount} membre{memberCount > 1 ? "s" : ""} ont indiqué leur planning
          </p>

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

          <div className="overflow-x-auto -mx-3 px-3">
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

          {canManage && (
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
        </>
      )}
    </div>
  );
}
