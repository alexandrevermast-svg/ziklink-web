// ============================================================
// app/(protected)/admin/page.tsx — Dashboard modération admin
// ============================================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Flag, Check, X, Eye, AlertTriangle,
  User, Music2, Mic2, MessageSquare, Users,
  ShieldBan, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  reporter_id: string;
  target_type: 'user' | 'jam' | 'concert' | 'message' | 'group';
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reporter_profile?: { username: string | null } | null;
}

const TARGET_ICONS: Record<string, React.ReactNode> = {
  user:    <User className="h-3.5 w-3.5" />,
  jam:     <Music2 className="h-3.5 w-3.5" />,
  concert: <Mic2 className="h-3.5 w-3.5" />,
  message: <MessageSquare className="h-3.5 w-3.5" />,
  group:   <Users className="h-3.5 w-3.5" />,
};

const REASON_LABELS: Record<string, string> = {
  spam:                'Spam',
  contenu_inapproprie: 'Contenu inapproprié',
  harcelement:         'Harcèlement',
  faux_profil:         'Faux profil',
  autre:               'Autre',
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  pending:   { label: 'En attente',  className: 'bg-orange-100 text-orange-700' },
  reviewed:  { label: 'En cours',    className: 'bg-blue-100 text-blue-700' },
  resolved:  { label: 'Résolu',      className: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Rejeté',      className: 'bg-gray-100 text-gray-500' },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color} flex flex-col gap-1`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

export default function AdminModerationPage() {
  const supabase = createClient();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('reports')
      .select('*, reporter_profile:profiles!reporter_id(username)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setReports((data ?? []).map((r: any) => ({
      ...r,
      reporter_profile: r.reporter_profile ?? null,
    })));
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile?.is_admin) { router.push('/'); return; }
      setIsAuthorized(true);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAuthorized) fetchReports();
  }, [isAuthorized, fetchReports]);

  const handleUpdateStatus = async (
    reportId: string,
    newStatus: ReportStatus,
    targetType?: string,
    targetId?: string
  ) => {
    setProcessingId(reportId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('reports').update({
      status: newStatus,
      admin_note: adminNote[reportId] ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq('id', reportId);

    // Si "résolu" sur un user → option de bannissement
    await fetchReports();
    setProcessingId(null);
    setExpandedId(null);
  };

  const handleBanUser = async (userId: string, reportId: string) => {
    setProcessingId(reportId);
    await supabase.from('profiles').update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      banned_reason: adminNote[reportId] ?? 'Signalement validé',
    }).eq('id', userId);
    await handleUpdateStatus(reportId, 'resolved', 'user', userId);
  };

  const handleDeleteContent = async (
    targetType: string,
    targetId: string,
    reportId: string
  ) => {
    setProcessingId(reportId);
    const tableMap: Record<string, string> = {
      jam:     'jam_sessions',
      concert: 'concerts',
      message: 'messages',
      group:   'groups',
    };
    const table = tableMap[targetType];
    if (table) {
      await supabase.from(table).delete().eq('id', targetId);
    }
    await handleUpdateStatus(reportId, 'resolved', targetType, targetId);
  };

  const stats = {
    pending:   reports.filter((r) => r.status === 'pending').length,
    reviewed:  reports.filter((r) => r.status === 'reviewed').length,
    resolved:  reports.filter((r) => r.status === 'resolved').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
  };

  if (isAuthorized === null) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Flag className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Modération</h1>
          <p className="text-xs text-gray-400">Dashboard admin — signalements</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="En attente" value={stats.pending} color="bg-orange-50 border-orange-100 text-orange-700" />
        <StatCard label="En cours" value={stats.reviewed} color="bg-blue-50 border-blue-100 text-blue-700" />
        <StatCard label="Résolus" value={stats.resolved} color="bg-green-50 border-green-100 text-green-700" />
        <StatCard label="Rejetés" value={stats.dismissed} color="bg-gray-50 border-gray-100 text-gray-500" />
      </div>

      {/* Filtres */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'Tous' : STATUS_CONFIG[f].label}
            {f === 'pending' && stats.pending > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <Check className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Aucun signalement dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            const isProcessing = processingId === report.id;
            return (
              <div
                key={report.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  report.status === 'pending'
                    ? 'border-orange-200 bg-orange-50/30'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Ligne principale */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/60 transition-colors"
                >
                  {/* Icône type */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    report.target_type === 'user' ? 'bg-blue-100 text-blue-600' :
                    report.target_type === 'jam' ? 'bg-green-100 text-green-600' :
                    report.target_type === 'concert' ? 'bg-red-100 text-red-600' :
                    report.target_type === 'message' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {TARGET_ICONS[report.target_type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 capitalize">{report.target_type}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[report.status].className}`}>
                        {STATUS_CONFIG[report.status].label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Signalé par <span className="font-medium text-gray-600">{report.reporter_profile?.username ?? 'Inconnu'}</span>
                      {' · '}{timeAgo(report.created_at)}
                    </p>
                  </div>

                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  }
                </button>

                {/* Panel étendu */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-white space-y-4">
                    {/* Infos */}
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="text-gray-400 shrink-0 w-20">Cible :</span>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 break-all">{report.target_id}</code>
                      </div>
                      {report.details && (
                        <div className="flex gap-2">
                          <span className="text-gray-400 shrink-0 w-20">Détails :</span>
                          <span className="text-gray-700 text-xs">{report.details}</span>
                        </div>
                      )}
                      {report.admin_note && (
                        <div className="flex gap-2">
                          <span className="text-gray-400 shrink-0 w-20">Note :</span>
                          <span className="text-gray-700 text-xs italic">{report.admin_note}</span>
                        </div>
                      )}
                    </div>

                    {/* Liens rapides */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          const paths: Record<string, string> = {
                            jam:     `/events/jams/${report.target_id}`,
                            concert: `/events/concerts/${report.target_id}`,
                            user:    `/profile/${report.target_id}`,
                            group:   `/groups/${report.target_id}`,
                          };
                          const path = paths[report.target_type];
                          if (path) router.push(path);
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir le contenu
                      </button>
                    </div>

                    {/* Note admin */}
                    {report.status === 'pending' || report.status === 'reviewed' ? (
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Note admin (optionnel)</label>
                        <textarea
                          value={adminNote[report.id] ?? ''}
                          onChange={(e) => setAdminNote((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          placeholder="Ex: contenu supprimé, avertissement envoyé..."
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    ) : null}

                    {/* Actions */}
                    {(report.status === 'pending' || report.status === 'reviewed') && (
                      <div className="flex flex-wrap gap-2">
                        {/* Marquer en cours */}
                        {report.status === 'pending' && (
                          <Button size="sm" variant="outline"
                            className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                            disabled={isProcessing}
                            onClick={() => handleUpdateStatus(report.id, 'reviewed')}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> En cours
                          </Button>
                        )}

                        {/* Rejeter */}
                        <Button size="sm" variant="outline"
                          className="text-xs border-gray-200 text-gray-500 hover:bg-gray-50"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(report.id, 'dismissed')}>
                          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
                          Rejeter
                        </Button>

                        {/* Résoudre */}
                        <Button size="sm"
                          className="text-xs bg-green-600 hover:bg-green-700"
                          disabled={isProcessing}
                          onClick={() => handleUpdateStatus(report.id, 'resolved', report.target_type, report.target_id)}>
                          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Résolu
                        </Button>

                        {/* Supprimer le contenu */}
                        {report.target_type !== 'user' && (
                          <Button size="sm"
                            className="text-xs bg-red-500 hover:bg-red-600"
                            disabled={isProcessing}
                            onClick={() => handleDeleteContent(report.target_type, report.target_id, report.id)}>
                            <X className="h-3.5 w-3.5 mr-1" /> Supprimer le contenu
                          </Button>
                        )}

                        {/* Bannir l'utilisateur */}
                        {report.target_type === 'user' && (
                          <Button size="sm"
                            className="text-xs bg-red-600 hover:bg-red-700"
                            disabled={isProcessing}
                            onClick={() => handleBanUser(report.target_id, report.id)}>
                            <ShieldBan className="h-3.5 w-3.5 mr-1" /> Bannir l'utilisateur
                          </Button>
                        )}
                      </div>
                    )}

                    {(report.status === 'resolved' || report.status === 'dismissed') && (
                      <p className="text-xs text-gray-400 italic">
                        {report.status === 'resolved' ? '✓ Résolu' : '✗ Rejeté'}
                        {report.reviewed_at && ` · ${timeAgo(report.reviewed_at)}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}