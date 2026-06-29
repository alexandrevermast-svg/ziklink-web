'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Mode : 'login' | 'signup' ──────────────────────────────────────────
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // ── Connexion Email/Password ───────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setErrorMsg(error.message); return; }
        router.push('/');
      } else {
        // Inscription
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Redirige vers l'onboarding après confirmation email (si activé)
            emailRedirectTo: `${location.origin}/onboarding`,
          },
        });
        if (error) { setErrorMsg(error.message); return; }
        // Si confirmation email désactivée dans Supabase → connexion directe
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          router.push('/onboarding');
        } else {
          // Confirmation email activée → message d'attente
          setSuccessMsg('Un email de confirmation a été envoyé. Vérifie ta boîte mail !');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // ── Connexion Google ──────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('Erreur de connexion Google :', error);
      setErrorMsg(error.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md space-y-4 border border-gray-200 p-6 rounded-2xl bg-white shadow-lg">

        {/* Logo / Titre */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">Ziklink 🎸</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Content de te revoir !' : 'Rejoins la communauté !'}
          </p>
        </div>

        {/* Toggle Login / Signup */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            S'inscrire
          </button>
        </div>

        {/* Formulaire Email/Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Email</label>
            <input
              className="border w-full p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="ton@email.com"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 text-gray-700">Mot de passe</label>
            <input
              className="border w-full p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signup' ? 'Minimum 6 caractères' : '••••••••'}
            />
          </div>

          {errorMsg && (
            <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-green-600 text-sm text-center bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
            disabled={loading}
          >
            {loading
              ? mode === 'login' ? 'Connexion...' : 'Création...'
              : mode === 'login' ? 'Se connecter' : 'Créer mon compte'
            }
          </button>
        </form>

        {/* Séparateur */}
        <div className="relative flex items-center py-2">
          <div className="grow border-t border-gray-200" />
          <span className="shrink mx-4 text-gray-400 text-xs font-medium">OU</span>
          <div className="grow border-t border-gray-200" />
        </div>

        {/* Bouton Google */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white border border-gray-300 text-gray-800 py-2.5 rounded-xl flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors font-medium text-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.1 24.5c0-1.57-.14-3.09-.4-4.5H24v8.51h12.44c-.58 2.91-2.22 5.34-4.66 7.04l7.3 5.67C43.37 37.6 46.1 31.5 46.1 24.5z"/>
            <path fill="#FBBC04" d="M10.53 28.5c-.34-1.02-.53-2.1-.53-3.2s.19-2.18.53-3.21l-7.98-6.19C.92 18.13 0 20.96 0 24s.92 5.87 2.56 8.1l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.77l-7.3-5.67c-2.13 1.43-4.86 2.28-8.6 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Se connecter avec Google
        </button>

      </div>
    </main>
  );
}