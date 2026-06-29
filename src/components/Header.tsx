'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
    if (pathname?.startsWith('/messages/')) return null;
  const supabase = createClient();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // ✅ Ajout : récupération du userId pour la cloche
  const [userId, setUserId] = useState<string | null>(null);
  // état pour savoir si l'utilisateur est admin
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      // Détecte un flag d'admin dans user_metadata si présent
      setIsAdmin(Boolean(user?.user_metadata?.is_admin));
    });
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.refresh();
      router.push('/login');
    } else {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 max-w-6xl mx-auto">
        {/* Bouton menu utilisateur (gauche) */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>

          {/* Menu déroulant */}
          {isMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
              <Link
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Mon compte
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Modération
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>

        {/* Logo centré */}
        <Link href="/" className="text-xl font-bold text-blue-600 tracking-tight">
          ZikLink
        </Link>

        {/* ✅ Cloche notifications (droite) */}
        <NotificationBell userId={userId} />
      </div>
    </header>
  );
}