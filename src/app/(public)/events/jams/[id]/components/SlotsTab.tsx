import { TabsContent } from "@/components/ui/tabs";
import { UserPlus, Play, Radio, Music, X, Plus, Flag, Check } from "lucide-react";
import { Avatar } from "./Avatar";
import { GuitarHeadstockIcon, BassHeadstockIcon } from "./InstrumentIcons";
import { INSTRUMENTS } from "../types";
import type { JamSlot, Profile } from "../types";

function InstrumentIcon({ instKey, emoji }: { instKey: string; emoji: string }) {
  if (instKey === "guitare") return <GuitarHeadstockIcon className="h-4 w-4 shrink-0" />;
  if (instKey === "basse") return <BassHeadstockIcon className="h-4 w-4 shrink-0" />;
  return <span className="text-sm leading-none">{emoji}</span>;
}

interface SlotsTabProps {
  canInteract: boolean;
  isOrganizer: boolean;
  currentUserId: string | null;
  hasDrums: boolean;
  hasKeyboard: boolean;
  slots: JamSlot[];
  numRows: number;
  currentSlotIndex: number | null;
  lastSlotIndex: number | null;
  onSetLastSlot: (rowIdx: number) => void;
  claimingCell: { instrument: string; slot_index: number } | null;
  pickerCell: { instrument: string; slot_index: number; anchorEl: HTMLElement } | null;
  editingSongSlotId: string | null;
  songInputValue: string;
  onSongInputChange: (v: string) => void;
  editingScaleSlotId: string | null;
  scaleInputValue: string;
  onScaleInputChange: (v: string) => void;
  onSetCurrentSlot: (rowIdx: number) => void;
  onEmptyCellClick: (instrument: string, slot_index: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onRelease: (slotId: string) => void;
  onAvatarClick: (profile: Profile, e: React.MouseEvent) => void;
  onStartEditSong: (slot: JamSlot, e: React.MouseEvent) => void;
  onSaveSong: (slotId: string) => void;
  onCancelEditSong: () => void;
  onStartEditScale: (slot: JamSlot, e: React.MouseEvent) => void;
  onSaveScale: (slotId: string) => void;
  onCancelEditScale: () => void;
}

export function SlotsTab({
  canInteract, isOrganizer, currentUserId, hasDrums, hasKeyboard, slots, numRows, currentSlotIndex,
  lastSlotIndex, onSetLastSlot,
  claimingCell, pickerCell,
  editingSongSlotId, songInputValue, onSongInputChange,
  editingScaleSlotId, scaleInputValue, onScaleInputChange,
  onSetCurrentSlot, onEmptyCellClick,
  onRelease, onAvatarClick, onStartEditSong, onSaveSong, onCancelEditSong,
  onStartEditScale, onSaveScale, onCancelEditScale,
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
      {!canInteract && <p className="text-sm text-zik-muted text-center mb-1">Rejoins la jam pour t'inscrire dans un créneau 🎸</p>}
      {isOrganizer && (
        <p className="text-sm text-zik-muted text-center mb-1">
          ▶️ passage en cours · 🏁 dernier passage (ferme les inscriptions après)
        </p>
      )}

      {Array.from({ length: numRows }, (_, rowIdx) => {
        const isTrailing = rowIdx > maxOccupiedIndex;
        const isCurrentSlot = currentSlotIndex === rowIdx;
        const isLastSlot = lastSlotIndex === rowIdx;
        const isPast = currentSlotIndex !== null && rowIdx < currentSlotIndex;
        // Créneau représentatif du passage — le même pour tout le monde, pour que le
        // morceau/la gamme affichés soient partagés plutôt que propres à chaque visiteur.
        const rowSlots = slots.filter((s) => s.slot_index === rowIdx && !!s.user_id);
        const infoSlot = rowSlots[0] ?? null;
        const isEditingSong = !!infoSlot && editingSongSlotId === infoSlot.id;
        const isEditingScale = !!infoSlot && editingScaleSlotId === infoSlot.id;
        // N'importe quel musicien assigné à ce passage (ou l'organisateur) peut compléter
        // le morceau et la gamme — pas seulement celui dont dépend le créneau représentatif.
        const canEditInfo = !!infoSlot && (isOrganizer || rowSlots.some((s) => s.user_id === currentUserId));

        return (
          <div key={rowIdx} className={`rounded-xl border overflow-hidden transition-all ${
            isCurrentSlot
              ? "border-zik-emerald/40 bg-zik-emerald/5"
              : isLastSlot
                ? "border-zik-orange/40 bg-zik-orange/5"
                : isPast
                  ? "border-zik-border/40 bg-zik-card/20 opacity-60"
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
                {isOrganizer && (
                  <button onClick={() => onSetLastSlot(rowIdx)}
                    title={isLastSlot ? "Retirer la limite" : "Marquer comme dernier passage"}
                    className={`h-6 w-6 flex items-center justify-center rounded-full shrink-0 transition-all duration-150 ${
                      isLastSlot
                        ? "bg-zik-orange text-white shadow-md shadow-zik-orange/20"
                        : "text-zik-muted hover:text-zik-orange hover:bg-zik-orange/10"
                    }`}>
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                )}
                {isPast && <Check className="h-3.5 w-3.5 text-zik-muted shrink-0" />}
                <span className={`text-base font-semibold ${
                  isCurrentSlot ? "text-zik-emerald" : isLastSlot ? "text-zik-orange" : isPast || isTrailing ? "text-zik-muted" : "text-zik-text"
                }`}>
                  Passage {rowIdx + 1}
                </span>
                {isLastSlot && (
                  <span className="text-xs font-semibold text-zik-orange bg-zik-orange/10 px-1.5 py-0.5 rounded-full shrink-0">
                    Dernier
                  </span>
                )}
                {isPast && (
                  <span className="text-xs font-medium text-zik-muted shrink-0">Terminé</span>
                )}
              </div>

              {infoSlot && (
                <div className="flex items-center gap-1.5 min-w-0">
                  {isEditingSong ? (
                    <input autoFocus value={songInputValue}
                      onChange={(e) => onSongInputChange(e.target.value)}
                      onBlur={() => onSaveSong(infoSlot.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveSong(infoSlot.id);
                        if (e.key === "Escape") onCancelEditSong();
                      }}
                      placeholder="Ex: Wonderwall"
                      className="min-w-0 w-24 text-sm border border-zik-purple/30 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zik-purple/50 bg-zik-card text-zik-text placeholder:text-zik-muted"
                    />
                  ) : (
                    <button
                      onClick={(e) => canEditInfo ? onStartEditSong(infoSlot, e) : undefined}
                      className={`flex items-center gap-1 text-sm min-w-0 shrink-0 max-w-24 ${
                        canEditInfo ? "cursor-pointer hover:text-zik-purple" : ""
                      }`}>
                      {infoSlot.song ? (
                        <><Music className="h-3 w-3 text-zik-purple shrink-0" /><span className="truncate text-zik-text">{infoSlot.song}</span></>
                      ) : canEditInfo ? (
                        <span className="text-zik-muted">+ Morceau</span>
                      ) : null}
                    </button>
                  )}

                  {(infoSlot.song || infoSlot.scale || canEditInfo) && (
                    <span className="text-sm text-zik-muted/40 shrink-0">·</span>
                  )}

                  {isEditingScale ? (
                    <input autoFocus value={scaleInputValue}
                      onChange={(e) => onScaleInputChange(e.target.value)}
                      onBlur={() => onSaveScale(infoSlot.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveScale(infoSlot.id);
                        if (e.key === "Escape") onCancelEditScale();
                      }}
                      placeholder="Ex: La mineur"
                      className="min-w-0 w-20 text-sm border border-zik-purple/30 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zik-purple/50 bg-zik-card text-zik-text placeholder:text-zik-muted"
                    />
                  ) : (
                    <button
                      onClick={(e) => canEditInfo ? onStartEditScale(infoSlot, e) : undefined}
                      className={`text-sm min-w-0 shrink-0 max-w-20 truncate ${
                        canEditInfo ? "cursor-pointer hover:text-zik-purple" : ""
                      }`}>
                      {infoSlot.scale ? (
                        <span className="truncate text-zik-text">{infoSlot.scale}</span>
                      ) : canEditInfo ? (
                        <span className="text-zik-muted">+ Gamme</span>
                      ) : null}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Instruments */}
            <div className="grid grid-cols-3 gap-1.5 p-2">
              {displayInstruments.map((inst) => {
                const slot = getSlot(inst.key, rowIdx);
                const isMe = slot?.user_id === currentUserId;
                const isClaiming = claimingCell?.instrument === inst.key && claimingCell?.slot_index === rowIdx;
                const isPickerOpen = pickerCell?.instrument === inst.key && pickerCell?.slot_index === rowIdx;

                return (
                  <div key={inst.key} className="flex flex-col items-center gap-1 rounded-lg border border-zik-border/60 p-1.5 min-w-0">
                    <span className="flex items-center gap-1 text-xs text-zik-muted truncate max-w-full">
                      <InstrumentIcon instKey={inst.key} emoji={inst.emoji} />
                      <span className="truncate">{inst.label}</span>
                    </span>

                    {slot ? (
                      <div className={`flex items-center gap-1 px-1.5 py-1 rounded-full text-xs font-medium w-full min-w-0 ${
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
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : canInteract ? (
                      <button
                        onClick={(e) => onEmptyCellClick(inst.key, rowIdx, e)}
                        title={isOrganizer ? "Assigner" : "Rejoindre"}
                        className={`flex items-center justify-center gap-1 w-full py-1 rounded-full text-xs font-medium border border-dashed transition-colors ${
                          isClaiming || isPickerOpen
                            ? "border-zik-purple/50 bg-zik-purple/10 text-zik-purple"
                            : "border-zik-border text-zik-muted hover:border-zik-purple/50 hover:text-zik-purple"
                        }`}>
                        {isClaiming ? (
                          <span className="animate-pulse">...</span>
                        ) : isOrganizer ? (
                          <UserPlus className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
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
