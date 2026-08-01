"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, MapPin, Users, MessageCircle, Loader2 } from "lucide-react";
import { GroupAvatar } from "@/app/(protected)/groups/GroupAvatar";
import type { Group as GroupRow } from "@/types";

const INSTRUMENTS = [
  { key: "chant", label: "Chant", emoji: "🎤" },
  { key: "guitare", label: "Guitare", emoji: "🎸" },
  { key: "basse", label: "Basse", emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier", label: "Clavier", emoji: "🎹" },
  { key: "autres", label: "Autres", emoji: "🎶" },
];

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

interface MusicianProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  instruments: string[] | null;
}

type GroupResult = Pick<GroupRow, "id" | "name" | "bio" | "city" | "genre" | "avatar_url" | "created_by">;

function MusicianAvatar({ profile }: { profile: MusicianProfile }) {
  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : "?";
  return profile.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username ?? ""} className="h-10 w-10 rounded-full object-cover shrink-0" />
  ) : (
    <div className="h-10 w-10 rounded-full bg-zik-purple flex items-center justify-center text-white text-sm font-semibold shrink-0">
      {initials}
    </div>
  );
}

export default function PeopleSearchTab() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"musiciens" | "groupes">("musiciens");

  // Recherche musiciens
  const [musicianTerm, setMusicianTerm] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [musicianCity, setMusicianCity] = useState("");
  const [onlyLookingForGroup, setOnlyLookingForGroup] = useState(false);
  const [musicians, setMusicians] = useState<MusicianProfile[]>([]);
  const [isMusicianSearchDone, setIsMusicianSearchDone] = useState(false);

  // Recherche groupes
  const [groupTerm, setGroupTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [groupCity, setGroupCity] = useState("");
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [isGroupSearchDone, setIsGroupSearchDone] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [contactingId, setContactingId] = useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const toggleInstrument = (key: string) => {
    setSelectedInstruments((prev) => prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]);
  };

  const searchMusicians = async () => {
    setIsSearching(true);
    let query = supabase.from("profiles").select("id, username, avatar_url, city, instruments");
    if (onlyLookingForGroup) query = query.eq("looking_for_group", true);
    if (musicianTerm.trim()) query = query.ilike("username", `%${musicianTerm.trim()}%`);
    if (musicianCity.trim()) query = query.ilike("city", `%${musicianCity.trim()}%`);
    if (selectedInstruments.length > 0) query = query.contains("instruments", selectedInstruments);
    if (currentUserId) query = query.neq("id", currentUserId);

    const { data } = await query.limit(30);
    setMusicians(data ?? []);
    setIsMusicianSearchDone(true);
    setIsSearching(false);
  };

  const searchGroups = async () => {
    setIsSearching(true);
    let query = supabase.from("groups").select("id, name, bio, city, genre, avatar_url, created_by");
    if (groupTerm.trim()) query = query.ilike("name", `%${groupTerm.trim()}%`);
    if (groupCity.trim()) query = query.ilike("city", `%${groupCity.trim()}%`);
    if (selectedGenre) query = query.eq("genre", selectedGenre);

    const { data } = await query.limit(30);
    setGroups(data ?? []);
    setIsGroupSearchDone(true);
    setIsSearching(false);
  };

  const handleContact = async (targetUserId: string) => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent("/groups")}`); return; }
    if (targetUserId === currentUserId) return;
    setContactingId(targetUserId);
    const { data: convId } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: targetUserId });
    setContactingId(null);
    if (convId) router.push(`/messages/${convId}`);
  };

  return (
    <div className="flex flex-col gap-4 pt-4 px-4 pb-24">
      <div className="flex gap-2">
        {([
          { key: "musiciens", label: "Musiciens" },
          { key: "groupes", label: "Groupes" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === key ? "bg-zik-purple text-white" : "bg-zik-card text-zik-muted hover:bg-zik-card-hover"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "musiciens" ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <Input
              value={musicianTerm}
              onChange={(e) => setMusicianTerm(e.target.value)}
              placeholder="Rechercher par pseudo..."
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
            <Input
              value={musicianCity}
              onChange={(e) => setMusicianCity(e.target.value)}
              placeholder="Ville (ex: Paris)"
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => {
                const isSelected = selectedInstruments.includes(inst.key);
                return (
                  <button
                    key={inst.key}
                    onClick={() => toggleInstrument(inst.key)}
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
            <div className="flex items-center justify-between rounded-lg border border-zik-border p-3 bg-zik-card/50">
              <span className="text-sm font-medium text-zik-text">Uniquement ceux qui cherchent un groupe</span>
              <Switch
                checked={onlyLookingForGroup}
                onCheckedChange={setOnlyLookingForGroup}
                className="data-[state=checked]:bg-zik-purple data-[state=unchecked]:bg-zik-card-hover"
              />
            </div>
          </div>

          <Button onClick={searchMusicians} disabled={isSearching} className="w-full bg-zik-purple hover:bg-zik-indigo">
            {isSearching ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recherche...</> : <><Search className="h-4 w-4 mr-2" /> Rechercher</>}
          </Button>

          {isMusicianSearchDone && (
            <div className="space-y-2">
              {musicians.length === 0 ? (
                <p className="text-sm text-zik-muted text-center py-6">Aucun musicien trouvé avec ces critères.</p>
              ) : musicians.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zik-card border border-zik-border">
                  <button
                    onClick={() => router.push(`/profile/${profile.id}`)}
                    className="flex items-center gap-2.5 min-w-0 text-left"
                  >
                    <MusicianAvatar profile={profile} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zik-text truncate">{profile.username ?? "Inconnu"}</p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {profile.city && (
                          <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                            <MapPin className="h-3 w-3" /> {profile.city}
                          </span>
                        )}
                        {profile.instruments?.slice(0, 3).map((inst) => {
                          const instrument = INSTRUMENTS.find((i) => i.key === inst);
                          return instrument ? (
                            <span key={inst} className="text-xs bg-zik-purple/10 text-zik-purple px-1.5 py-0.5 rounded-full">
                              {instrument.emoji} {instrument.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </button>
                  <Button
                    size="sm"
                    className="text-xs bg-zik-purple/10 text-zik-purple hover:bg-zik-purple/20 shrink-0"
                    onClick={() => handleContact(profile.id)}
                    disabled={contactingId === profile.id}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    {contactingId === profile.id ? "..." : "Contacter"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <Input
              value={groupTerm}
              onChange={(e) => setGroupTerm(e.target.value)}
              placeholder="Rechercher par nom de groupe..."
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
            <Input
              value={groupCity}
              onChange={(e) => setGroupCity(e.target.value)}
              placeholder="Ville (ex: Paris)"
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const isSelected = selectedGenre === g;
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGenre(isSelected ? "" : g)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? "bg-zik-purple text-white border-zik-purple"
                        : "bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={searchGroups} disabled={isSearching} className="w-full bg-zik-purple hover:bg-zik-indigo">
            {isSearching ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recherche...</> : <><Search className="h-4 w-4 mr-2" /> Rechercher</>}
          </Button>

          {isGroupSearchDone && (
            <div className="space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-zik-muted text-center py-6">Aucun groupe trouvé avec ces critères.</p>
              ) : groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => router.push(`/groups/${group.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-zik-border bg-zik-card hover:border-zik-purple/30 hover:shadow-sm transition-all text-left active:scale-[0.99]"
                >
                  <GroupAvatar group={group} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zik-text truncate">{group.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {group.genre && (
                        <span className="text-xs bg-zik-purple/10 text-zik-purple font-medium px-2 py-0.5 rounded-full">
                          {group.genre}
                        </span>
                      )}
                      {group.city && (
                        <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                          <MapPin className="h-3 w-3" />{group.city}
                        </span>
                      )}
                    </div>
                    {group.bio && <p className="text-xs text-zik-muted mt-1 line-clamp-1">{group.bio}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
