'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import { User, LogOut, Shield } from 'lucide-react';
import { ZikLogo } from '@/components/ZikLogo';

export default function Header() {
  const pathname = usePathname();
  if (pathname?.startsWith('/messages/')) return null;

  const supabase = createClient();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setIsAdmin(Boolean(user?.user_metadata?.is_admin));
    });
  }, []);

  // Ferme le menu si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.refresh();
      router.push('/login');
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(14, 11, 22, 0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">

        {/* Bouton profil (gauche) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              width: 36,
              height: 36,
              background: isMenuOpen
                ? 'rgba(192,132,252,0.15)'
                : 'rgba(255,255,255,0.06)',
              border: '1px solid',
              borderColor: isMenuOpen
                ? 'rgba(192,132,252,0.30)'
                : 'rgba(255,255,255,0.10)',
              color: isMenuOpen ? '#C084FC' : 'rgba(255,255,255,0.55)',
            }}
          >
            <User size={17} strokeWidth={1.75} />
          </button>

          {/* Menu déroulant */}
          {isMenuOpen && (
            <div
              className="absolute left-0 mt-2 w-44 rounded-xl overflow-hidden z-50"
              style={{
                background: '#1A1628',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              }}
            >
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.75)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <User size={14} strokeWidth={1.75} style={{ color: '#C084FC' }} />
                Mon compte
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors duration-150"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Shield size={14} strokeWidth={1.75} style={{ color: '#F87171' }} />
                  Modération
                </Link>
              )}

              {/* Séparateur */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

              <button
                onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors duration-150"
                style={{ color: '#F87171' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} strokeWidth={1.75} />
                Se déconnecter
              </button>
            </div>
          )}
        </div>

        {/* Logo centré */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <ZikLogo size="md" />
        </Link>

        {/* Cloche notifications (droite) */}
        <NotificationBell userId={userId} />
      </div>

      {/* Safe area iPhone */}
      <div style={{ height: 'env(safe-area-inset-top)' }} />
    </header>
  );
}