import { TabsContent } from "@/components/ui/tabs";
import { UserPlus, Play, Radio, Music, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { INSTRUMENTS } from "../types";
import type { JamSlot, Profile } from "../types";

interface SlotsTabProps {
  canInteract: boolean;
  isOrganizer: boolean;
  currentUserId: string | null;
  hasDrums: boolean;
  hasKeyboard: boolean;
  slots: JamSlot[];
  numRows: number;
  currentSlotIndex: number | null;
  claimingCell: { instrument: string; slot_index: number } | null;
  pickerCell: { instrument: string; slot_index: number; anchorEl: HTMLElement } | null;
  editingSongSlotId: string | null;
  songInputValue: string;
  onSongInputChange: (v: string) => void;
  onSetCurrentSlot: (rowIdx: number) => void;
  onEmptyCellClick: (instrument: string, slot_index: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onRelease: (slotId: string) => void;
  onAvatarClick: (profile: Profile, e: React.MouseEvent) => void;
  onStartEditSong: (slot: JamSlot, e: React.MouseEvent) => void;
  onSaveSong: (slotId: string) => void;
  onCancelEditSong: () => void;
}

export function SlotsTab({
  canInteract, isOrganizer, currentUserId, hasDrums, hasKeyboard, slots, numRows, currentSlotIndex,
  claimingCell, pickerCell,
  editingSongSlotId, songInputValue, onSongInputChange,
  onSetCurrentSlot, onEmptyCellClick,
  onRelease, onAvatarClick, onStartEditSong, onSaveSong, onCancelEditSong,
}: SlotsTabProps) {
  const getSlot = (instrument: string, slot_index: number) =>
    slots.find((s) => s.instrument === instrument && s.slot_index === slot_index) ?? null;

  // Colonne clavier masquée si la jam n'en a pas ; batterie relabellisée en
  // percussions plutôt que masquée, puisqu'on peut toujours jouer des percus sans kit.
  const displayInstruments = INSTRUMENTS
    .filter((inst) => inst.key !== "clavier" || hasKeyboard)
    .map((inst) => inst.key === "batterie" && !hasDrums
      ? { ...inst, label: "Percussions", emoji: "🪘" }
      : inst
    );

  const maxOccupiedIndex = slots.length > 0 ? Math.max(...slots.map((s) => s.slot_index)) : -1;

  return (
    <TabsContent value="slots" className="flex-1 overflow-auto px-3 py-3 space-y-2.5">
      {!canInteract && <p className="text-xs text-zik-muted text-center mb-1">Rejoins la jam pour t'inscrire dans un créneau 🎸</p>}
      {isOrganizer && (
        <p className="text-xs text-zik-muted text-center mb-1">
          ▶️ pour marquer un passage en cours
        </p>
      )}

      {Array.from({ length: numRows }, (_, rowIdx) => {
        const isTrailing = rowIdx > maxOccupiedIndex;
        const isCurrentSlot = currentSlotIndex === rowIdx;
        const rowSlots = slots.filter((s) => s.slot_index === rowIdx && !!s.user_id);
        const songSlot = rowSlots.find((s) => s.user_id === currentUserId) ?? rowSlots[0] ?? null;
        const isEditingSong = !!songSlot && editingSongSlotId === songSlot.id;
        const canEditSong = !!songSlot && (songSlot.user_id === currentUserId || isOrganizer);

        return (
          <div key={rowIdx} className={`rounded-xl border overflow-hidden transition-colors ${
            isCurrentSlot
              ? "border-zik-emerald/40 bg-zik-emerald/5"
              : isTrailing
                ? "border-dashed border-zik-border/50 bg-zik-card/20"
                : "border-zik-border bg-zik-card/50"
          }`}>
            {/* En-tête : numéro / marquer en cours / morceau */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zik-border/60">
              <div className="flex items-center gap-2 min-w-0 shrink-0">
                {isOrganizer && (
                  <button onClick={() => onSetCurrentSlot(rowIdx)}
                    title={isCurrentSlot ? "Désactiver ce passage" : "Marquer comme en cours"}
                    className={`h-6 w-6 flex items-center justify-center rounded-full shrink-0 transition-all duration-150 ${
                      isCurrentSlot
                        ? "bg-zik-emerald text-white shadow-md shadow-zik-emerald/20 hover:bg-zik-red"
                        : "text-zik-muted hover:text-zik-emerald hover:bg-zik-emerald/10"
                    }`}>
                    {isCurrentSlot ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                )}
                <span className={`text-sm font-semibold ${
                  isCurrentSlot ? "text-zik-emerald" : isTrailing ? "text-zik-muted" : "text-zik-text"
                }`}>
                  Passage {rowIdx + 1}
                </span>
              </div>

              {songSlot && (
                isEditingSong ? (
                  <input autoFocus value={songInputValue}
                    onChange={(e) => onSongInputChange(e.target.value)}
                    onBlur={() => onSaveSong(songSlot.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveSong(songSlot.id);
                      if (e.key === "Escape") onCancelEditSong();
                    }}
                    placeholder="Ex: Wonderwall"
                    className="flex-1 min-w-0 text-xs border border-zik-purple/30 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-zik-purple/50 bg-zik-card text-zik-text placeholder:text-zik-muted"
                  />
                ) : (
                  <button
                    onClick={(e) => canEditSong ? onStartEditSong(songSlot, e) : undefined}
                    className={`flex items-center gap-1 text-xs min-w-0 shrink-0 max-w-32 ${
                      canEditSong ? "cursor-pointer hover:text-zik-purple" : ""
                    }`}>
                    {songSlot.song ? (
                      <><Music className="h-3 w-3 text-zik-purple shrink-0" /><span className="truncate text-zik-text">{songSlot.song}</span></>
                    ) : canEditSong ? (
                      <span className="text-zik-muted">+ Morceau</span>
                    ) : null}
                  </button>
                )
              )}
            </div>

            {/* Instruments */}
            <div className="p-2 space-y-1">
              {displayInstruments.map((inst) => {
                const slot = getSlot(inst.key, rowIdx);
                const isMe = slot?.user_id === currentUserId;
                const isClaiming = claimingCell?.instrument === inst.key && claimingCell?.slot_index === rowIdx;
                const isPickerOpen = pickerCell?.instrument === inst.key && pickerCell?.slot_index === rowIdx;

                return (
                  <div key={inst.key} className="flex items-center gap-2 px-1 py-0.5">
                    <span className="flex items-center gap-1.5 text-xs text-zik-muted w-24 shrink-0">
                      <span className="text-sm">{inst.emoji}</span> {inst.label}
                    </span>

                    {slot ? (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium flex-1 min-w-0 ${
                        isMe && isCurrentSlot
                          ? "bg-zik-emerald/10 text-zik-emerald border border-zik-emerald/30"
                          : isMe
                            ? "bg-zik-purple/10 text-zik-purple border border-zik-purple/30"
                            : "bg-zik-card text-zik-text border border-zik-border"
                      }`}>
                        <Avatar
                          profile={slot.profile ?? (slot.guest_name ? { id: "", username: slot.guest_name, avatar_url: null } : null)}
                          size="sm"
                          onClick={slot.profile && slot.user_id !== currentUserId
                            ? (e) => onAvatarClick(slot.profile!, e) : undefined} />
                        <span className="truncate flex-1">{slot.profile?.username ?? slot.guest_name ?? "?"}</span>
                        {(isMe || isOrganizer) && (
                          <button onClick={() => onRelease(slot.id)}
                            className="opacity-60 hover:opacity-100 hover:text-zik-red transition-colors shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ) : canInteract ? (
                      <button
                        onClick={(e) => onEmptyCellClick(inst.key, rowIdx, e)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed transition-colors ${
                          isClaiming || isPickerOpen
                            ? "border-zik-purple/50 bg-zik-purple/10 text-zik-purple"
                            : "border-zik-border text-zik-muted hover:border-zik-purple/50 hover:text-zik-purple"
                        }`}>
                        {isClaiming ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <><UserPlus className="h-3 w-3" /> {isOrganizer ? "Assigner" : "Rejoindre"}</>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-zik-muted/50">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </TabsContent>
  );
}
