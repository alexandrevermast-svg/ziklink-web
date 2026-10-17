'use client';

import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Camera, MapPin, Check, Loader2, Sparkles
} from 'lucide-react';

// Config
const INSTRUMENTS = [
  { key: 'chant',    label: 'Chant',    emoji: '🎤' },
  { key: 'guitare',  label: 'Guitare',  emoji: '🎸' },
  { key: 'basse',    label: 'Basse',    emoji: '🎵' },
  { key: 'batterie', label: 'Batterie', emoji: '🥁' },
  { key: 'clavier',  label: 'Clavier',  emoji: '🎹' },
  { key: 'autres',   label: 'Autres',   emoji: '🎶' },
];

function OptionalTag() {
  return <span className="text-zik-muted font-normal">(optionnel)</span>;
}

// Écran final de succès
function StepSuccess({ username }: { username: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center py-4">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-linear-to-br from-zik-emerald to-zik-grad-to flex items-center justify-center shadow-lg">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zik-text">C'est parti, {username} ! 🎸</h1>
        <p className="text-zik-muted mt-2 text-sm leading-relaxed">
          Ton profil est prêt.<br />
          Découvre les jams près de chez toi, crée les tiennes,<br />
          rejoins des groupes et connecte-toi avec d'autres musiciens.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full text-sm text-zik-muted">
        <div className="flex items-center gap-2 bg-zik-card/50 rounded-xl p-3">
          <span className="text-lg">🗺️</span>
          <span>Trouve des jams sur la carte de l'accueil</span>
        </div>
        <div className="flex items-center gap-2 bg-zik-card/50 rounded-xl p-3">
          <span className="text-lg">🎸</span>
          <span>Crée ta première jam depuis l'onglet Events</span>
        </div>
        <div className="flex items-center gap-2 bg-zik-card/50 rounded-xl p-3">
          <span className="text-lg">👥</span>
          <span>Rejoins ou crée un groupe depuis l'onglet Groupe</span>
        </div>
      </div>
    </div>
  );
}

// Page principale
function OnboardingForm() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '';

  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Champs
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleInstrument = (key: string) => {
    setInstruments((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    );
  };

  const handleAvatarFile = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Validation pseudo
  const validateUsername = async (): Promise<boolean> => {
    const val = username.trim();
    if (!val) { setUsernameError('Le pseudo est obligatoire'); return false; }
    if (val.length < 3) { setUsernameError('Au moins 3 caractères'); return false; }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameError('Uniquement lettres, chiffres et _');
      return false;
    }
    // Unicité
    const { data } = await supabase.from('profiles').select('id').eq('username', val).maybeSingle();
    if (data) { setUsernameError('Ce pseudo est déjà pris'); return false; }
    setUsernameError(null);
    return true;
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await validateUsername();
    if (!ok) return;

    setIsSaving(true);
    setFinishError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }

      const { data: updated, error } = await supabase.from('profiles').upsert({
        id: user.id,
        username: username.trim(),
        instruments,
        city: city.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      }, { onConflict: 'id' }).select('id');

      if (error) {
        setFinishError(error.message.includes('duplicate') || error.message.includes('unique')
          ? 'Ce pseudo est déjà pris.'
          : `Erreur : ${error.message}`);
        return;
      }
      if (!updated || updated.length === 0) {
        setFinishError("La mise à jour du profil n'a pas pu être enregistrée. Réessaie ou contacte-nous si ça persiste.");
        return;
      }

      setIsDone(true);
    } catch (e) {
      console.error(e);
      setFinishError("Une erreur inattendue s'est produite.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToApp = () => {
    router.push(next || '/');
    router.refresh();
  };

  const initials = username ? username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-zik-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zik-card rounded-3xl shadow-xl overflow-hidden">
        {!isDone ? (
          <form onSubmit={handleFinish} className="px-6 py-6 flex flex-col gap-6">
            <div className="text-center">
              <div className="text-5xl mb-3">👋</div>
              <h1 className="text-2xl font-bold text-zik-text">Bienvenue sur Ziklink !</h1>
              <p className="text-zik-muted mt-2 text-sm">
                Complète ton profil pour commencer.<br />
                Seul le pseudo est obligatoire, le reste peut être rempli plus tard.
              </p>
            </div>

            {/* Pseudo */}
            <div>
              <label className="text-sm font-medium text-zik-text mb-1.5 block">Ton pseudo *</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: guitare_hero42"
                maxLength={30}
                autoFocus
                className={`bg-zik-bg border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50 ${
                  usernameError ? 'border-zik-red/50 focus:ring-zik-red/50' : ''
                }`}
              />
              {usernameError && <p className="text-xs text-zik-red mt-1">{usernameError}</p>}
              <p className="text-xs text-zik-muted mt-1">{username.length}/30 caractères · lettres, chiffres et _</p>
            </div>

            {/* Instruments */}
            <div>
              <label className="text-sm font-medium text-zik-text mb-1.5 block">
                Instruments <OptionalTag />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {INSTRUMENTS.map((inst) => {
                  const active = instruments.includes(inst.key);
                  return (
                    <button
                      key={inst.key}
                      type="button"
                      onClick={() => toggleInstrument(inst.key)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all active:scale-[0.97] ${
                        active
                          ? 'border-zik-grad-to bg-zik-grad-to/10 text-zik-grad-to'
                          : 'border-zik-border bg-zik-bg text-zik-muted hover:border-zik-grad-to/50 hover:bg-zik-card-hover'
                      }`}
                    >
                      <span className="text-xl shrink-0">{inst.emoji}</span>
                      <span className="font-semibold text-sm">{inst.label}</span>
                      {active && <Check className="h-4 w-4 ml-auto shrink-0 text-zik-grad-to" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ville */}
            <div>
              <label className="text-sm font-medium text-zik-text mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zik-grad-to" /> Ville <OptionalTag />
              </label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Paris, Lyon, Marseille..."
                className="bg-zik-bg border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-zik-text mb-1.5 block">
                Présente-toi <OptionalTag />
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: Guitariste depuis 10 ans, fan de blues et de rock..."
                rows={3}
                maxLength={280}
                className="w-full border-zik-border rounded-xl px-3 py-2.5 text-sm resize-none outline-none bg-zik-bg text-zik-text placeholder:text-zik-muted focus:ring-2 focus:ring-zik-grad-to/50 transition-all"
              />
              <p className="text-xs text-zik-muted text-right mt-0.5">{bio.length}/280</p>
            </div>

            {/* Photo */}
            <div>
              <label className="text-sm font-medium text-zik-text mb-1.5 block">
                Photo de profil <OptionalTag />
              </label>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="preview"
                      className="h-16 w-16 rounded-full object-cover border-4 border-zik-bg shadow-lg"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-linear-to-br from-zik-grad-to to-zik-indigo flex items-center justify-center text-white text-xl font-bold border-4 border-zik-bg shadow-lg">
                      {initials}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-zik-card border border-zik-border shadow-md flex items-center justify-center hover:bg-zik-card-hover transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-zik-muted" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-sm font-medium text-zik-grad-to hover:text-zik-indigo transition-colors"
                >
                  {avatarPreview ? 'Changer la photo' : 'Choisir une photo'}
                </button>
              </div>
            </div>

            {finishError && <p className="text-xs text-zik-red text-center">{finishError}</p>}

            <Button
              type="submit"
              disabled={isSaving}
              className="w-full bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 text-base py-3 h-auto"
            >
              {isSaving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</>
                : <><Sparkles className="h-4 w-4 mr-2" /> Créer mon profil</>
              }
            </Button>
          </form>
        ) : (
          /* Écran succès */
          <div className="px-6 py-8 flex flex-col gap-6">
            <StepSuccess username={username} />
            <Button
              onClick={handleGoToApp}
              className="w-full bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 text-base py-3 h-auto"
            >
              Découvrir Ziklink 🎸
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}
