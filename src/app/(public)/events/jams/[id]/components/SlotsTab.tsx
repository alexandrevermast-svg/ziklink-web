import { useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { UserPlus, Play, X, Plus, Flag, Check, Guitar, ChevronDown, ChevronUp, Music2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { GuitarHeadstockIcon, BassHeadstockIcon } from "./InstrumentIcons";
import type { JamSlot, JamInstrument, Profile } from "../types";
import { getDisplayName } from "../types";

function InstrumentIcon({ instKey, emoji }: { instKey: string; emoji: string }) {
  if (instKey === "guitare") return <GuitarHeadstockIcon className="h-8 w-8 object-contain shrink-0" />;
  if (instKey === "basse") return <BassHeadstockIcon className="h-8 w-8 object-contain shrink-0" />;
  if (instKey === "guitare_acoustique") return <Guitar className="h-8 w-8 shrink-0" />;
  return <span className="text-3xl leading-none shrink-0">{emoji}</span>;
}

// Clé technique utilisée comme "instrument" quand la jam est en mode solo —
// un seul créneau par passage, sans distinction d'instrument.
export const SOLO_INSTRUMENT_KEY = "solo";

interface SlotsTabProps {
  canInteract: boolean;
  isOrganizer: boolean;
  soloMode: boolean;
  currentUserId: string | null;
  instruments: JamInstrument[];
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
  canInteract, isOrganizer, soloMode, currentUserId, instruments, slots, numRows, currentSlotIndex,
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

  const maxOccupiedIndex = slots.length > 0 ? Math.max(...slots.map((s) => s.slot_index)) : -1;
  const pastCount = currentSlotIndex ?? 0;
  const [showPast, setShowPast] = useState(false);

  return (
    <TabsContent value="slots" className="flex-1 overflow-auto px-3 py-3">
      {!canInteract && <p className="text-base text-zik-muted text-center mb-2">Rejoins la jam pour t'inscrire dans un créneau 🎸</p>}

      {pastCount > 0 && (
        <button onClick={() => setShowPast((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium text-zik-muted hover:text-zik-grad-to transition-colors mb-2.5">
          {showPast ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showPast ? "Masquer" : "Afficher"} les {pastCount} tour{pastCount > 1 ? "s" : ""} déjà effectué{pastCount > 1 ? "s" : ""}
        </button>
      )}

      <div className="relative">
        {/* Frise reliant les tours, derrière les marqueurs */}
        <div className="pointer-events-none absolute left-4 top-4 bottom-4 w-px bg-linear-to-b from-white/10 via-zik-emerald/25 to-white/10" />

        {Array.from({ length: numRows }, (_, rowIdx) => {
          const isTrailing = rowIdx > maxOccupiedIndex;
          const isCurrentSlot = currentSlotIndex === rowIdx;
          const isLastSlot = lastSlotIndex === rowIdx;
          const isPast = currentSlotIndex !== null && rowIdx < currentSlotIndex;
          if (isPast && !showPast) return null;
          // Créneau représentatif du tour — le même pour tout le monde, pour que le
          // morceau/la gamme affichés soient partagés plutôt que propres à chaque visiteur.
          const rowSlots = slots.filter((s) => s.slot_index === rowIdx && !!s.user_id);
          const infoSlot = rowSlots[0] ?? null;
          const isEditingSong = !!infoSlot && editingSongSlotId === infoSlot.id;
          const isEditingScale = !!infoSlot && editingScaleSlotId === infoSlot.id;
          // N'importe quel musicien assigné à ce tour (ou l'organisateur) peut compléter
          // le morceau et la gamme — pas seulement celui dont dépend le créneau représentatif.
          const canEditInfo = !!infoSlot && (isOrganizer || rowSlots.some((s) => s.user_id === currentUserId));

          // Mode solo : un seul créneau par tour — pas de grille par
          // instrument, une seule pastille d'inscription.
          const soloSlot = soloMode ? getSlot(SOLO_INSTRUMENT_KEY, rowIdx) : null;
          const isSoloClaiming = claimingCell?.instrument === SOLO_INSTRUMENT_KEY && claimingCell?.slot_index === rowIdx;
          const isSoloPickerOpen = pickerCell?.instrument === SOLO_INSTRUMENT_KEY && pickerCell?.slot_index === rowIdx;
          const isSoloMe = soloSlot?.user_id === currentUserId;

          // Marqueur sur la frise — double aussi de bouton "marquer en cours"
          // pour l'organisateur, à la place de l'ancien bouton dédié.
          const marker = (
            <button
              type="button"
              onClick={() => isOrganizer && onSetCurrentSlot(rowIdx)}
              disabled={!isOrganizer}
              title={isOrganizer ? (isCurrentSlot ? "Désactiver ce tour" : "Marquer comme en cours") : undefined}
              className={`relative z-10 h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                isCurrentSlot
                  ? "bg-zik-emerald text-zik-bg shadow-[0_0_0_3px_rgba(52,211,153,0.20),0_4px_14px_-2px_rgba(52,211,153,0.55)]"
                  : isPast
                    ? "bg-zik-bg border border-white/10 text-zik-muted"
                    : isLastSlot
                      ? "bg-zik-bg border border-dashed border-zik-orange/50 text-zik-orange"
                      : isTrailing
                        ? `bg-zik-bg border border-dashed border-white/12 text-zik-muted/60 ${isOrganizer ? "hover:border-zik-emerald/50 hover:text-zik-emerald cursor-pointer" : "cursor-default"}`
                        : `bg-zik-bg border border-white/15 text-zik-text/70 ${isOrganizer ? "hover:border-zik-emerald/50 hover:text-zik-emerald cursor-pointer" : "cursor-default"}`
              }`}
            >
              {isCurrentSlot ? <Play className="h-3.5 w-3.5 fill-current" /> : isPast ? <Check className="h-3.5 w-3.5" /> : rowIdx + 1}
            </button>
          );

          const songScaleControls = infoSlot && (
            <div className="flex items-center gap-1.5 min-w-0 px-3.5">
              {!infoSlot.song && !isEditingSong && canEditInfo && (
                <button
                  onClick={(e) => onStartEditSong(infoSlot, e)}
                  className="text-sm text-zik-muted hover:text-zik-grad-to shrink-0 cursor-pointer">
                  + Morceau
                </button>
              )}
              {!infoSlot.song && !isEditingSong && canEditInfo && (
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
                  className="min-w-0 w-20 text-sm border border-zik-grad-to/30 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zik-grad-to/50 bg-zik-card text-zik-text placeholder:text-zik-muted"
                />
              ) : (
                <button
                  onClick={(e) => canEditInfo ? onStartEditScale(infoSlot, e) : undefined}
                  className={`text-sm min-w-0 shrink-0 max-w-24 truncate ${canEditInfo ? "cursor-pointer hover:text-zik-grad-to" : ""}`}>
                  {infoSlot.scale ? (
                    <span className="truncate text-zik-muted">{infoSlot.scale}</span>
                  ) : canEditInfo ? (
                    <span className="text-zik-muted">+ Gamme</span>
                  ) : null}
                </button>
              )}
            </div>
          );

          // Pastille d'inscription réutilisée par les deux modes (grille par
          // instrument, ou créneau unique fusionné en mode solo).
          const renderSlotPill = (slot: JamSlot | null, instrumentKey: string, label: string | null, isMe: boolean, isClaiming: boolean, isPickerOpen: boolean) => (
            slot ? (
              <div className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 min-w-0 ${
                isMe && isCurrentSlot
                  ? "bg-zik-emerald/10 border border-zik-emerald/30"
                  : isMe
                    ? "bg-zik-grad-to/10 border border-zik-grad-to/30"
                    : "bg-white/4 border border-white/8"
              }`}>
                {label && <InstrumentIcon instKey={instrumentKey} emoji={instruments.find((i) => i.key === instrumentKey)?.emoji ?? ""} />}
                <Avatar
                  profile={slot.profile ?? (slot.guest_name ? { id: "", username: slot.guest_name, avatar_url: null } : null)}
                  size="md"
                  onClick={slot.profile && slot.user_id !== currentUserId
                    ? (e) => onAvatarClick(slot.profile!, e) : undefined} />
                <span className="truncate flex-1 text-base font-semibold text-zik-text">
                  {getDisplayName(slot.profile, slot.guest_name ?? "?")}
                  {isMe && <span className="text-zik-grad-to font-medium"> (toi)</span>}
                </span>
                {(isMe || isOrganizer) && (
                  <button onClick={() => onRelease(slot.id)}
                    className="opacity-60 hover:opacity-100 hover:text-zik-red transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : isPast ? (
              <div className="flex items-center px-2 py-1.5 text-zik-muted/40 text-sm">
                <span className="truncate">— {label}</span>
              </div>
            ) : canInteract ? (
              <button
                onClick={(e) => onEmptyCellClick(instrumentKey, rowIdx, e)}
                title={isOrganizer ? "Assigner" : "Rejoindre"}
                className={`flex items-center justify-center gap-1.5 rounded-xl border border-dashed px-2 py-1.5 text-sm font-medium transition-colors ${
                  isClaiming || isPickerOpen
                    ? "border-zik-grad-to/50 bg-zik-grad-to/10 text-zik-grad-to"
                    : "border-white/12 text-zik-muted hover:border-zik-grad-to/40 hover:text-zik-grad-to"
                }`}>
                {isClaiming ? (
                  <span className="animate-pulse">...</span>
                ) : isOrganizer ? (
                  <UserPlus className="h-4 w-4 shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0" />
                )}
                {label && <span className="truncate">{label}</span>}
              </button>
            ) : (
              <div className="flex items-center px-2 py-1.5 text-zik-muted/40 text-sm">
                <span className="truncate">— {label}</span>
              </div>
            )
          );

          // En-tête commun aux deux modes : titre (morceau ou "Tour N"), état
          // "en direct", badges Dernier/Terminé, bascule "dernier tour".
          const header = (
            <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
              <div className="min-w-0">
                {isCurrentSlot && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-zik-emerald shadow-[0_0_0_3px_rgba(52,211,153,0.22)]" />
                    <span className="text-xs font-extrabold tracking-wide text-zik-emerald">EN COURS</span>
                  </div>
                )}
                {isEditingSong && !soloMode ? (
                  <input autoFocus value={songInputValue}
                    onChange={(e) => onSongInputChange(e.target.value)}
                    onBlur={() => onSaveSong(infoSlot!.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSaveSong(infoSlot!.id);
                      if (e.key === "Escape") onCancelEditSong();
                    }}
                    placeholder="Ex: Wonderwall"
                    className="min-w-0 w-36 text-lg font-bold border border-zik-grad-to/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-zik-grad-to/50 bg-zik-card text-zik-text placeholder:text-zik-muted"
                  />
                ) : infoSlot?.song && !soloMode ? (
                  <button
                    onClick={(e) => canEditInfo ? onStartEditSong(infoSlot, e) : undefined}
                    className={`flex items-center gap-1.5 text-lg font-bold min-w-0 truncate ${
                      canEditInfo ? "cursor-pointer hover:text-zik-grad-to" : ""
                    } ${isCurrentSlot ? "text-zik-text" : isLastSlot ? "text-zik-orange" : isTrailing ? "text-zik-muted" : "text-zik-text"}`}>
                    <Music2 className="h-5 w-5 shrink-0" />
                    <span className="truncate">{infoSlot.song}</span>
                  </button>
                ) : (
                  <span className={`text-lg font-bold ${
                    isCurrentSlot ? "text-zik-text" : isLastSlot ? "text-zik-orange" : isTrailing ? "text-zik-muted" : "text-zik-text"
                  }`}>
                    Tour {rowIdx + 1}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isLastSlot && (
                  <span className="flex items-center gap-1 text-xs font-bold text-zik-orange bg-zik-orange/10 px-2 py-0.5 rounded-full">
                    <Flag className="h-3 w-3" /> DERNIER
                  </span>
                )}
                {isPast && (
                  <span className="text-xs font-semibold text-zik-muted bg-white/5 px-2 py-0.5 rounded-full">Terminé</span>
                )}
                {isOrganizer && (
                  <button onClick={() => onSetLastSlot(rowIdx)}
                    title={isLastSlot ? "Retirer la limite" : "Marquer comme dernier tour"}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      isLastSlot ? "text-zik-orange" : "text-zik-muted/50 hover:text-zik-orange hover:bg-zik-orange/10"
                    }`}>
                    <Flag className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );

          const cardClass = `flex-1 min-w-0 rounded-2xl border transition-all ${
            isCurrentSlot
              ? "border-zik-emerald/35 bg-white/4 shadow-[0_0_0_1px_rgba(52,211,153,0.08),0_12px_28px_-10px_rgba(52,211,153,0.35)]"
              : isLastSlot
                ? "border-dashed border-zik-orange/30 bg-zik-orange/3"
                : isPast
                  ? "border-white/5 bg-white/2 opacity-70"
                  : isTrailing
                    ? "border-dashed border-white/10 bg-white/2"
                    : "border-white/8 bg-white/4"
          }`;

          if (soloMode) {
            return (
              <div key={rowIdx} className="relative z-10 flex gap-3 pb-3.5">
                <div className="pt-0.5">{marker}</div>
                <div className={cardClass}>
                  {header}
                  <div className="px-3.5 pt-2 pb-3">
                    {renderSlotPill(soloSlot, SOLO_INSTRUMENT_KEY, null, isSoloMe, isSoloClaiming, isSoloPickerOpen)}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={rowIdx} className="relative z-10 flex gap-3 pb-3.5">
              <div className="pt-0.5">{marker}</div>
              <div className={cardClass}>
                {header}
                {songScaleControls}
                <div className="flex flex-col gap-1.5 p-3">
                  {instruments.map((inst) => {
                    const slot = getSlot(inst.key, rowIdx);
                    const isMe = slot?.user_id === currentUserId;
                    const isClaiming = claimingCell?.instrument === inst.key && claimingCell?.slot_index === rowIdx;
                    const isPickerOpen = pickerCell?.instrument === inst.key && pickerCell?.slot_index === rowIdx;
                    return (
                      <div key={inst.key}>
                        {renderSlotPill(slot, inst.key, inst.label, isMe, isClaiming, isPickerOpen)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isOrganizer && (
        <div className="flex items-center justify-center gap-4 mt-1 pt-3 border-t border-white/5">
          <span className="flex items-center gap-1.5 text-sm text-zik-muted">
            <Play className="h-3.5 w-3.5 fill-current text-zik-emerald" /> Tour en cours
          </span>
          <span className="flex items-center gap-1.5 text-sm text-zik-muted">
            <Flag className="h-3.5 w-3.5 text-zik-orange" /> Ferme les inscriptions après
          </span>
        </div>
      )}
    </TabsContent>
  );
}
