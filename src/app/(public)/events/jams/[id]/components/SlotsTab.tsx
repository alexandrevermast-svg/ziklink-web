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
  draggedSlot: { id: string; instrument: string; slot_index: number } | null;
  dragOverCell: { instrument: string; slot_index: number } | null;
  claimingCell: { instrument: string; slot_index: number } | null;
  pickerCell: { instrument: string; slot_index: number; anchorEl: HTMLElement } | null;
  editingSongSlotId: string | null;
  songInputValue: string;
  onSongInputChange: (v: string) => void;
  onSetCurrentSlot: (rowIdx: number) => void;
  onEmptyCellClick: (instrument: string, slot_index: number, e: React.MouseEvent<HTMLTableCellElement>) => void;
  onDragStart: (slot: JamSlot) => void;
  onDragOver: (e: React.DragEvent, instrument: string, slot_index: number) => void;
  onDrop: (instrument: string, slot_index: number) => void;
  onDragEnd: () => void;
  onDragLeave: () => void;
  onRelease: (slotId: string) => void;
  onAvatarClick: (profile: Profile, e: React.MouseEvent) => void;
  onStartEditSong: (slot: JamSlot, e: React.MouseEvent) => void;
  onSaveSong: (slotId: string) => void;
  onCancelEditSong: () => void;
}

export function SlotsTab({
  canInteract, isOrganizer, currentUserId, hasDrums, hasKeyboard, slots, numRows, currentSlotIndex,
  draggedSlot, dragOverCell, claimingCell, pickerCell,
  editingSongSlotId, songInputValue, onSongInputChange,
  onSetCurrentSlot, onEmptyCellClick, onDragStart, onDragOver, onDrop, onDragEnd, onDragLeave,
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

  return (
    <TabsContent value="slots" className="flex-1 overflow-auto px-2 py-3">
      {!canInteract && <p className="text-xs text-zik-muted text-center mb-3">Rejoins la jam pour t'inscrire dans un créneau 🎸</p>}
      {isOrganizer && (
        <p className="text-xs text-zik-muted text-center mb-3">
          ▶️ pour marquer un passage · <span className="text-zik-purple">clic sur + pour assigner un participant</span>
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              {isOrganizer && <th className="w-8 py-2 border-b border-zik-border" />}
              <th className="w-8 py-2 text-zik-muted font-normal text-center border-b border-zik-border">#</th>
              {displayInstruments.map((inst) => (
                <th key={inst.key} className="py-2 px-1 text-center font-semibold text-zik-text border-b border-zik-border">
                  <span className="block text-base leading-none mb-0.5">{inst.emoji}</span>
                  {inst.label}
                </th>
              ))}
              <th className="py-2 px-2 text-center font-semibold text-zik-text border-b border-zik-border min-w-25">
                <span className="block text-base leading-none mb-0.5">🎵</span>
                Morceau
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRows }, (_, rowIdx) => {
              const maxOccupiedIndex = slots.length > 0 ? Math.max(...slots.map((s) => s.slot_index)) : -1;
              const isTrailing = rowIdx > maxOccupiedIndex;
              const isCurrentSlot = currentSlotIndex === rowIdx;
              const rowSlots = slots.filter((s) => s.slot_index === rowIdx && !!s.user_id);
              const songSlot = rowSlots.find((s) => s.user_id === currentUserId) ?? rowSlots[0] ?? null;

              return (
                <tr key={rowIdx} className={`transition-colors duration-150 ${
                  isCurrentSlot
                    ? "bg-zik-emerald/10 border-l-4 border-l-zik-emerald"
                    : rowIdx % 2 === 0 ? "bg-zik-card/30" : "bg-zik-card/10"
                }`}>
                  {isOrganizer && (
                    <td className="px-1 py-1 text-center">
                      <button onClick={() => onSetCurrentSlot(rowIdx)}
                        title={isCurrentSlot ? "Désactiver ce passage" : "Marquer comme en cours"}
                        className={`h-6 w-6 flex items-center justify-center rounded-full transition-all duration-150 mx-auto ${
                          isCurrentSlot
                            ? "bg-zik-emerald text-white shadow-md shadow-zik-emerald/20 hover:bg-zik-red"
                            : "text-zik-muted hover:text-zik-emerald hover:bg-zik-emerald/10"
                        }`}>
                        {isCurrentSlot ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                  <td className={`text-center font-medium py-1.5 border-r border-zik-border ${
                    isCurrentSlot ? "text-zik-emerald font-bold" : isTrailing ? "text-zik-muted/50" : "text-zik-muted"
                  }`}>
                    {isCurrentSlot && <span className="mr-0.5">▶</span>}{rowIdx + 1}
                  </td>
                  {displayInstruments.map((inst) => {
                    const slot = getSlot(inst.key, rowIdx);
                    const isMe = slot?.user_id === currentUserId;
                    const isEmpty = !slot;
                    const isDragOver = dragOverCell?.instrument === inst.key && dragOverCell?.slot_index === rowIdx;
                    const isDragging = draggedSlot?.instrument === inst.key && draggedSlot?.slot_index === rowIdx;
                    const isClaiming = claimingCell?.instrument === inst.key && claimingCell?.slot_index === rowIdx;
                    const isPickerOpen = pickerCell?.instrument === inst.key && pickerCell?.slot_index === rowIdx;

                    return (
                      <td key={inst.key}
                        className={`px-1 py-1 border border-zik-border transition-all
                          ${isDragOver && !isDragging ? "bg-zik-purple/10 border-zik-purple/30" : ""}
                          ${isEmpty && canInteract ? "cursor-pointer hover:bg-zik-purple/5" : ""}
                          ${isDragging ? "opacity-40" : ""}
                          ${isPickerOpen ? "bg-zik-purple/10 border-zik-purple/30" : ""}
                        `}
                        onClick={(e) => isEmpty && canInteract ? onEmptyCellClick(inst.key, rowIdx, e) : undefined}
                        onDragOver={(e) => onDragOver(e, inst.key, rowIdx)}
                        onDrop={() => onDrop(inst.key, rowIdx)}
                        onDragLeave={onDragLeave}
                      >
                        {slot ? (
                          <div draggable={isMe || isOrganizer}
                            onDragStart={() => onDragStart(slot)} onDragEnd={onDragEnd}
                            className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium
                              ${isMe && isCurrentSlot
                                ? "bg-zik-emerald/10 text-zik-emerald border border-zik-emerald/30 cursor-grab active:cursor-grabbing"
                                : isMe
                                ? "bg-zik-purple/10 text-zik-purple border border-zik-purple/30 cursor-grab active:cursor-grabbing"
                                : "bg-zik-card/50 text-zik-text border border-zik-border"
                              }
                              ${isOrganizer && !isMe ? "cursor-grab active:cursor-grabbing" : ""}
                            `}>
                            <Avatar profile={slot.profile ?? null} size="sm"
                              onClick={slot.profile && slot.user_id !== currentUserId
                                ? (e) => onAvatarClick(slot.profile!, e) : undefined} />
                            <span className="truncate flex-1 max-w-15">{slot.profile?.username ?? "?"}</span>
                            {(isMe || isOrganizer) && (
                              <button onClick={(e) => { e.stopPropagation(); onRelease(slot.id); }}
                                className="text-zik-muted hover:text-zik-red transition-colors shrink-0 ml-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className={`h-7 rounded-md border border-dashed text-center flex items-center justify-center transition-all ${
                            isClaiming || isPickerOpen
                              ? "border-zik-purple/50 bg-zik-purple/10"
                              : canInteract
                                ? isTrailing
                                  ? "border-zik-border/30 text-zik-muted/50 hover:border-zik-purple/30 hover:text-zik-purple/70"
                                  : "border-zik-border/50 text-zik-muted hover:border-zik-purple/50 hover:text-zik-purple"
                                : "border-zik-border/30 text-zik-muted/50"
                          }`}>
                            {isClaiming
                              ? <span className="text-[10px] text-zik-purple animate-pulse font-medium">...</span>
                              : canInteract
                                ? isOrganizer
                                  ? <UserPlus className={`h-3.5 w-3.5 ${isPickerOpen ? "text-zik-purple" : "text-zik-muted"}`} />
                                  : <span className="text-lg leading-none text-zik-muted">+</span>
                                : null
                            }
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 border border-zik-border">
                    {songSlot ? (
                      editingSongSlotId === songSlot.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input autoFocus value={songInputValue}
                            onChange={(e) => onSongInputChange(e.target.value)}
                            onBlur={() => onSaveSong(songSlot.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onSaveSong(songSlot.id);
                              if (e.key === "Escape") onCancelEditSong();
                            }}
                            placeholder="Ex: Wonderwall"
                            className="flex-1 text-[11px] border border-zik-purple/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-zik-purple/50 min-w-0 bg-zik-card text-zik-text placeholder:text-zik-muted"
                          />
                        </div>
                      ) : (
                        <div onClick={(e) => (songSlot.user_id === currentUserId || isOrganizer) ? onStartEditSong(songSlot, e) : undefined}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] min-h-7 group
                            ${(songSlot.user_id === currentUserId || isOrganizer) ? "cursor-pointer hover:bg-zik-card-hover" : ""}`}>
                          {songSlot.song ? (
                            <><Music className="h-3 w-3 text-zik-purple shrink-0" />
                              <span className="truncate text-zik-text max-w-22.5">{songSlot.song}</span></>
                          ) : (
                            (songSlot.user_id === currentUserId || isOrganizer) &&
                            <span className="text-zik-muted group-hover:text-zik-purple transition-colors">+ Morceau</span>
                          )}
                        </div>
                      )
                    ) : <div className="h-7" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TabsContent>
  );
}
