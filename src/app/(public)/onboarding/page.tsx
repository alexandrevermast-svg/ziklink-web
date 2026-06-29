'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Camera, MapPin, Music2, ChevronRight, Loader2,
  Check, ArrowLeft, Sparkles
} from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  { key: 'chant',    label: 'Chant',    emoji: '🎤' },
  { key: 'guitare',  label: 'Guitare',  emoji: '🎸' },
  { key: 'basse',    label: 'Basse',    emoji: '🎵' },
  { key: 'batterie', label: 'Batterie', emoji: '🥁' },
  { key: 'clavier',  label: 'Clavier',  emoji: '🎹' },
  { key: 'autres',   label: 'Autres',   emoji: '🎶' },
];

const TOTAL_STEPS = 4;

// ── Progress bar ─────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            i < step ? 'bg-blue-600' : i === step ? 'bg-blue-300' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────

// Étape 0 : Pseudo
function StepUsername({
  value, onChange, error,
}: { value: string; onChange: (v: string) => void; error: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue sur Ziklink !</h1>
        <p className="text-gray-500 mt-2 text-sm">Commence par choisir ton nom d'utilisateur.<br />C'est comme ça que les autres musiciens te trouveront.</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Ton pseudo *</label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: guitare_hero42"
          maxLength={30}
          autoFocus
          className={error ? 'border-red-300 focus:ring-red-300' : ''}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <p className="text-xs text-gray-400 mt-1">{value.length}/30 caractères · lettres, chiffres et _</p>
      </div>
    </div>
  );
}

// Étape 1 : Instruments
function StepInstruments({
  selected, onToggle,
}: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🎸</div>
        <h1 className="text-2xl font-bold text-gray-900">Quels instruments tu joues ?</h1>
        <p className="text-gray-500 mt-2 text-sm">Sélectionne tout ce qui te correspond.<br />Tu pourras modifier ça plus tard.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {INSTRUMENTS.map((inst) => {
          const active = selected.includes(inst.key);
          return (
            <button
              key={inst.key}
              type="button"
              onClick={() => onToggle(inst.key)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.97] ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/30'
              }`}
            >
              <span className="text-2xl shrink-0">{inst.emoji}</span>
              <span className="font-semibold text-sm">{inst.label}</span>
              {active && <Check className="h-4 w-4 ml-auto shrink-0 text-blue-600" />}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-center text-gray-400">Tu peux aussi passer cette étape et compléter plus tard.</p>
      )}
    </div>
  );
}

// Étape 2 : Ville + Bio
function StepLocation({
  city, bio, onCityChange, onBioChange,
}: {
  city: string; bio: string;
  onCityChange: (v: string) => void;
  onBioChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">📍</div>
        <h1 className="text-2xl font-bold text-gray-900">Où tu jams ?</h1>
        <p className="text-gray-500 mt-2 text-sm">Ta ville permet aux autres musiciens de te trouver près de chez eux.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400" /> Ville
          </label>
          <Input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="Ex: Paris, Lyon, Marseille..."
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Présente-toi <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="Ex: Guitariste depuis 10 ans, fan de blues et de rock..."
            rows={3}
            maxLength={280}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-300 transition-all"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/280</p>
        </div>
      </div>
    </div>
  );
}

// Étape 3 : Photo
function StepPhoto({
  username, avatarPreview, onFileChange,
}: {
  username: string;
  avatarPreview: string | null;
  onFileChange: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = username ? username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="text-5xl mb-4">📸</div>
        <h1 className="text-2xl font-bold text-gray-900">Mets une photo de profil</h1>
        <p className="text-gray-500 mt-2 text-sm">Optionnel, mais ça aide les autres à te reconnaître !</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="preview"
              className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Camera className="h-4 w-4 text-gray-600" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
          />
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          {avatarPreview ? 'Changer la photo' : 'Choisir une photo'}
        </button>
      </div>
    </div>
  );
}

// Étape finale : Success
function StepSuccess({ username }: { username: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center py-4">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-linear-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">C'est parti, {username} ! 🎸</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          Ton profil est prêt.<br />
          Découvre les jams près de chez toi, crée les tiennes,<br />
          rejoins des groupes et connecte-toi avec d'autres musiciens.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full text-sm text-gray-400">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
          <span className="text-lg">🗺️</span>
          <span>Trouve des jams sur la carte de l'accueil</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
          <span className="text-lg">🎸</span>
          <span>Crée ta première jam depuis l'onglet Events</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
          <span className="text-lg">👥</span>
          <span>Rejoins ou crée un groupe depuis l'onglet Groupe</span>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Champs
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  const handleNext = async () => {
    if (step === 0) {
      const ok = await validateUsername();
      if (!ok) return;
    }
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
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

      await supabase.from('profiles').update({
        username: username.trim(),
        instruments,
        city: city.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      }).eq('id', user.id);

      setIsDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToApp = () => {
    router.push('/');
    router.refresh();
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {!isDone ? (
          <>
            {/* Barre de progression */}
            <div className="px-6 pt-6 pb-2">
              <ProgressBar step={step} />
              <p className="text-xs text-gray-400 mt-2 text-right">
                Étape {step + 1} / {TOTAL_STEPS}
              </p>
            </div>

            {/* Contenu de l'étape */}
            <div className="px-6 py-4 min-h-105">
              {step === 0 && (
                <StepUsername value={username} onChange={setUsername} error={usernameError} />
              )}
              {step === 1 && (
                <StepInstruments selected={instruments} onToggle={toggleInstrument} />
              )}
              {step === 2 && (
                <StepLocation
                  city={city} bio={bio}
                  onCityChange={setCity} onBioChange={setBio}
                />
              )}
              {step === 3 && (
                <StepPhoto
                  username={username}
                  avatarPreview={avatarPreview}
                  onFileChange={handleAvatarFile}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
              ) : <div />}

              {isLastStep ? (
                <Button
                  onClick={handleFinish}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                >
                  {isSaving
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</>
                    : <><Sparkles className="h-4 w-4 mr-2" /> Terminer</>
                  }
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                >
                  Suivant <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Skip pour étapes optionnelles */}
            {step > 0 && (
              <div className="text-center pb-4">
                <button
                  onClick={isLastStep ? handleFinish : handleNext}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Passer cette étape →
                </button>
              </div>
            )}
          </>
        ) : (
          /* Écran succès */
          <div className="px-6 py-8 flex flex-col gap-6">
            <StepSuccess username={username} />
            <Button
              onClick={handleGoToApp}
              className="w-full bg-blue-600 hover:bg-blue-700 text-base py-3 h-auto"
            >
              Découvrir Ziklink 🎸
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}