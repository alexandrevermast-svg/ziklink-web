// ============================================================
// components/ReportButton.tsx — Bouton signaler universel
// ============================================================
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { Flag, X, ChevronDown, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TargetType = 'user' | 'jam' | 'concert' | 'message' | 'group';

const REASONS: { value: string; label: string }[] = [
  { value: 'spam',               label: 'Spam ou publicité' },
  { value: 'contenu_inapproprie', label: 'Contenu inapproprié' },
  { value: 'harcelement',         label: 'Harcèlement' },
  { value: 'faux_profil',         label: 'Faux profil / usurpation' },
  { value: 'autre',               label: 'Autre raison' },
];

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
  /** Affichage : 'icon' = juste l'icône, 'text' = bouton avec texte */
  variant?: 'icon' | 'text';
  className?: string;
}

export default function ReportButton({
  targetType,
  targetId,
  variant = 'icon',
  className = '',
}: ReportButtonProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already'>('idle');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Ferme au clic extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        modalRef.current && !modalRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) handleClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setReason('');
    setDetails('');
    setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setStatus('loading');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus('idle'); return; }

    // Vérifie si déjà signalé
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle();

    if (existing) { setStatus('already'); return; }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });

    if (error) { setStatus('idle'); return; }
    setStatus('success');
    setTimeout(handleClose, 2000);
  };

  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        className={`flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors ${
          variant === 'text' ? 'text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-50' : 'p-1.5 rounded-full hover:bg-red-50'
        } ${className}`}
        title="Signaler"
      >
        <Flag className="h-3.5 w-3.5 shrink-0" />
        {variant === 'text' && <span>Signaler</span>}
      </button>

      {isOpen && rect && createPortal(
        <div
          ref={modalRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 6,
            left: Math.min(rect.left, window.innerWidth - 300),
            zIndex: 99999,
            width: 'min(90vw, 280px)',
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-red-500" /> Signaler
            </span>
            <button onClick={handleClose} className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          {status === 'success' ? (
            <div className="px-4 py-6 text-center">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Signalement envoyé</p>
              <p className="text-xs text-gray-400 mt-1">Notre équipe va examiner ça. Merci !</p>
            </div>
          ) : status === 'already' ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-orange-600 font-medium">Tu as déjà signalé ce contenu.</p>
              <button onClick={handleClose} className="text-xs text-gray-400 hover:text-gray-600 mt-3 block mx-auto">Fermer</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Motif *</label>
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <label key={r.value}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors text-sm ${
                        reason === r.value
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                      }`}>
                      <input type="radio" name="reason" value={r.value}
                        checked={reason === r.value} onChange={() => setReason(r.value)}
                        className="accent-red-500 shrink-0" />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Détails <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Décris le problème..."
                  rows={2}
                  maxLength={280}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none outline-none focus:ring-2 focus:ring-red-200 transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={!reason || status === 'loading'}
                className="w-full bg-red-500 hover:bg-red-600 text-white text-xs h-8"
              >
                {status === 'loading'
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Envoi...</>
                  : 'Envoyer le signalement'
                }
              </Button>
            </form>
          )}
        </div>,
        document.body
      )}
    </>
  );
}