// ============================================================
// app/(protected)/groups/page.tsx
// ============================================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, MapPin, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import GroupCreationForm from '@/components/GroupCreationForm';
import { GroupAvatar } from "./GroupAvatar";

interface Group {
  id: string; name: string; bio: string | null;
  city: string | null; genre: string | null;
  avatar_url: string | null; created_by: string; member_count?: number;
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* ✅ Overlay adapté à ton thème */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(14, 11, 22, 0.8)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--zik-card)',
        borderRadius: '12px',
        padding: '24px',
        width: 'min(90vw, 560px)',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        color: 'var(--zik-text)',
      }}>
        <div className="flex items-center justify-between mb-4">
          {/* ✅ Titre de la modale adapté */}
          <h2 className="text-xl font-bold text-zik-text">{title}</h2>
          {/* ✅ Bouton de fermeture adapté */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zik-card-hover text-zik-muted hover:text-zik-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function GroupsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    const { data } = await supabase
      .from('groups').select('id, name, bio, city, genre, avatar_url, created_by')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const ids = data.map((g) => g.id);
      const { data: members } = await supabase.from('group_members').select('group_id').in('group_id', ids);
      const countMap: Record<string, number> = {};
      for (const m of members ?? []) countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1;
      setGroups(data.map((g) => ({ ...g, member_count: countMap[g.id] ?? 0 })));
    } else {
      setGroups(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // ✅ Loading skeleton adapté
  if (isLoading) return (
    <div className="p-4 space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-zik-card animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          {/* ✅ Titre et sous-titre adaptés */}
          <h1 className="text-xl font-bold text-zik-text">Groupes</h1>
          <p className="text-sm text-zik-muted mt-0.5">
            {groups.length} groupe{groups.length > 1 ? 's' : ''} sur Ziklink
          </p>
        </div>
        {/* ✅ Bouton "Créer" adapté */}
        <Button
          size="sm"
          className="bg-zik-purple hover:bg-zik-indigo"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Créer
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-5xl">🎸</span>
          {/* ✅ Message adapté */}
          <p className="text-zik-muted text-sm">
            Aucun groupe pour l'instant.<br />Sois le premier à en créer un !
          </p>
          {/* ✅ Bouton adapté */}
          <Button
            className="bg-zik-purple hover:bg-zik-indigo mt-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Créer un groupe
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => router.push(`/groups/${group.id}`)}
              // ✅ Carte de groupe adaptée
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zik-border bg-zik-card hover:border-zik-purple/30 hover:shadow-sm transition-all text-left active:scale-[0.99]"
            >
              <GroupAvatar group={group} />
              <div className="flex-1 min-w-0">
                {/* ✅ Nom du groupe adapté */}
                <p className="font-semibold text-zik-text truncate">{group.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {/* ✅ Genre adapté */}
                  {group.genre && (
                    <span className="text-xs bg-zik-purple/10 text-zik-purple font-medium px-2 py-0.5 rounded-full">
                      {group.genre}
                    </span>
                  )}
                  {/* ✅ Ville adaptée */}
                  {group.city && (
                    <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                      <MapPin className="h-3 w-3" />{group.city}
                    </span>
                  )}
                  {/* ✅ Nombre de membres adapté */}
                  <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                    <Users className="h-3 w-3" />
                    {group.member_count} membre{(group.member_count ?? 0) > 1 ? 's' : ''}
                  </span>
                </div>
                {/* ✅ Bio adaptée */}
                {group.bio && (
                  <p className="text-xs text-zik-muted mt-1 line-clamp-1">{group.bio}</p>
                )}
              </div>
              {/* ✅ Flèche adaptée */}
              <ChevronRight className="h-4 w-4 text-zik-muted shrink-0" />
            </button>
          ))}
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Créer un groupe">
        <GroupCreationForm
          onSuccess={() => { setIsModalOpen(false); fetchGroups(); }}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}