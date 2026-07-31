import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MapPin, UserPlus } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import { INSTRUMENTS } from "../types";
import type { Profile } from "../types";

interface SearchMusicianModalProps {
  open: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchTermChange: (v: string) => void;
  selectedInstruments: string[];
  onToggleInstrument: (instrument: string) => void;
  distance: number;
  onDistanceChange: (v: number) => void;
  groupCity: string | null;
  onlyLookingForGroup: boolean;
  onToggleOnlyLookingForGroup: () => void;
  onSearch: () => void;
  isSearchLoading: boolean;
  searchResults: Profile[];
  onAvatarClick: (profile: Profile, e: React.MouseEvent<HTMLDivElement>) => void;
  onInvite: (userId: string) => void;
}

export function SearchMusicianModal({
  open, onClose, searchTerm, onSearchTermChange, selectedInstruments, onToggleInstrument,
  distance, onDistanceChange, groupCity, onlyLookingForGroup, onToggleOnlyLookingForGroup,
  onSearch, isSearchLoading, searchResults, onAvatarClick, onInvite,
}: SearchMusicianModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Chercher un musicien">
      <div className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">
              Rechercher par nom
            </label>
            <Input
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Nom d'utilisateur..."
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">
              Instruments
            </label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => {
                const isSelected = selectedInstruments.includes(inst.key);
                return (
                  <button
                    key={inst.key}
                    onClick={() => onToggleInstrument(inst.key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? "bg-zik-purple text-white border-zik-purple"
                        : "bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
                    }`}
                  >
                    <span>{inst.emoji}</span> {inst.label}
                  </button>
                );
              })}
            </div>
          </div>

          {groupCity && (
            <div>
              <label className="text-sm font-medium text-zik-text mb-1 block">
                Distance (km) - {groupCity}
              </label>
              <Input
                type="number"
                value={distance}
                onChange={(e) => onDistanceChange(Number(e.target.value) || 0)}
                min="0"
                max="200"
                className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zik-text cursor-pointer">
              Uniquement ceux qui cherchent un groupe
            </label>
            <Button
              variant={onlyLookingForGroup ? "default" : "outline"}
              size="sm"
              className={`h-7 w-7 p-0 ${
                onlyLookingForGroup
                  ? "bg-zik-purple hover:bg-zik-indigo"
                  : "border-zik-border text-zik-muted hover:bg-zik-card-hover"
              }`}
              onClick={onToggleOnlyLookingForGroup}
            >
              {onlyLookingForGroup ? "✓" : "✗"}
            </Button>
          </div>
        </div>

        <Button
          onClick={onSearch}
          disabled={isSearchLoading}
          className="w-full bg-zik-purple hover:bg-zik-indigo"
        >
          {isSearchLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </>
          )}
        </Button>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-sm text-zik-muted text-center py-4">
              Aucun musicien trouvé avec ces critères.
            </p>
          ) : (
            searchResults.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zik-card/50 border border-zik-border"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MemberAvatar
                    profile={profile}
                    onClick={(e) => onAvatarClick(profile, e)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zik-text truncate">
                      {profile.username ?? "Inconnu"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {profile.city && (
                        <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                          <MapPin className="h-3 w-3" /> {profile.city}
                        </span>
                      )}
                      {profile.instruments?.map((inst) => {
                        const instrument = INSTRUMENTS.find((i) => i.key === inst);
                        return instrument ? (
                          <span
                            key={inst}
                            className="text-xs bg-zik-purple/10 text-zik-purple px-1.5 py-0.5 rounded-full"
                          >
                            {instrument.emoji} {instrument.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-zik-purple/10 text-zik-purple hover:bg-zik-purple/20"
                  onClick={() => onInvite(profile.id)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Inviter
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
