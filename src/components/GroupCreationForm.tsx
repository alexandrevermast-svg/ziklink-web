// ============================================================
// components/GroupCreationForm.tsx
// ============================================================
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, MapPin, Music2 } from 'lucide-react';

const GENRES = ['Rock', 'Jazz', 'Blues', 'Metal', 'Pop', 'Électro', 'Folk', 'Classique', 'Hip-Hop', 'Reggae', 'Autre'];

interface GroupCreationFormProps {
  onSuccess?: (groupId: string) => void;
  onClose?: () => void;
}

export default function GroupCreationForm({ onSuccess, onClose }: GroupCreationFormProps) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [genre, setGenre] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Le nom du groupe est obligatoire'); return; }
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Vous devez être connecté'); setIsLoading(false); return; }

      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `groups/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      const { data: groupId, error } = await supabase.rpc('create_group', {
        p_name: name.trim(),
        p_bio: bio.trim() || null,
        p_city: city.trim() || null,
        p_genre: genre || null,
        p_avatar_url: avatarUrl,
      });

      onSuccess?.(groupId);
    } catch {
      setError("Une erreur s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar du groupe */}
      <div className="flex flex-col items-center gap-2">
        <label className="relative cursor-pointer group">
          {avatarPreview ? (
            // ✅ Bordure adaptée à ton thème
            <img src={avatarPreview} alt="preview" className="h-20 w-20 rounded-2xl object-cover border-2 border-zik-border" />
          ) : (
            // ✅ Dégradé adapté à ton thème
            <div className="h-20 w-20 rounded-2xl bg-linear-to-br from-zik-purple to-zik-indigo flex items-center justify-center text-white text-2xl font-bold">
              {name ? name.slice(0, 2).toUpperCase() : '🎸'}
            </div>
          )}
          {/* ✅ Overlay et icône adaptés */}
          <div className="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </label>
        {/* ✅ Texte adapté */}
        <p className="text-xs text-zik-muted">Photo du groupe (optionnel)</p>
      </div>

      {/* Nom du groupe */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">
          Nom du groupe <span className="text-zik-red">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Les Vieux Fourneaux"
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">Description</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Parlez de votre groupe, de votre style..."
          rows={3}
          maxLength={280}
          className="w-full border-zik-border rounded-lg px-3 py-2 text-sm resize-none outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-2 focus:ring-zik-purple transition-all"
        />
        {/* ✅ Compteur adapté */}
        <p className="text-xs text-zik-muted text-right mt-0.5">{bio.length}/280</p>
      </div>

      {/* Ville + Genre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zik-purple" /> Ville
          </label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Paris"
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5 text-zik-purple" /> Genre
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple mt-0.5"
          >
            <option value="">Sélectionner...</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Erreur */}
      {error && <p className="text-zik-red text-sm">{error}</p>}

      {/* Boutons */}
      <div className="flex gap-2 justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="border-zik-border text-zik-text hover:bg-zik-card-hover hover:text-zik-text"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-zik-purple hover:bg-zik-indigo text-white disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</> : 'Créer le groupe'}
        </Button>
      </div>
    </form>
  );
}