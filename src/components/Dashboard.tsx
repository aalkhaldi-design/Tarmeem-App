/**
 * Dashboard.tsx — Six MVP dashboard widgets
 * All widgets derive data from api.forms + projects already in App state.
 * No new Firestore listeners required.
 */

import React, { useMemo } from 'react';
import {
  Building2, Inbox, CheckCircle, Activity, Clock, TrendingUp,
  AlertTriangle, DollarSign, ArrowLeft, ShieldAlert, CalendarDays,
  FileText, Layers,
} from 'lucide-react';
import { Card, Pill, EmptyState, ProgressBar } from './ui';
import {
  FORM_BY_CODE, ROLE_BY_KEY, roleName,
  formatRelativeTime, formatCurrency, slaStatus,
} from '../lib/data';
import type { RoleKey } from '../lib/data';
import { formAwaitsUser } from './Forms';
import type { FormsApi, FormRecord } from './Forms';
import type { UserProfile } from './Auth';
import type { ProjectRecord } from './forms/FormRenderers';

/* ═══════════════════════════════════════════════════════════════════
   Widget 1 — KpiStrip
   Five headline numbers across all projects.
   ═══════════════════════════════════════════════════════════════════ */

export const KpiStrip: React.FC<{
  projects: ProjectRecord[];
  forms: FormRecord[];
  user: UserProfile;
}> = ({ projects, forms, user }) => {
  const now = new Date();
  const thisMonth = projects.filter(p => {
    const c = new Date(p.createdAt);
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
  }).length;

  const inbox = forms.filter(f => formAwaitsUser(f, user)).length;
  const active = projects.filter(p => !['CLOSED', 'REJECTED', 'CANCELLED'].includes(p.phase)).length;
  const closed = projects.filter(p => p.phase === 'CLOSED').length;

  const pills = [
    { icon: Building2,     label: 'إجمالي المشاريع',     value: projects.length, tone: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' },
    { icon: Activity,      label: 'مشاريع نشطة',          value: active,          tone: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200' },
    { icon: CheckCircle,   label: 'منازل مسلّمة',          value: closed,          tone: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200' },
    { icon: Inbox,         label: 'بانتظار اعتمادي',      value: inbox,           tone: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
    { icon: CalendarDays,  label: 'مشاريع هذا الشهر',    value: thisMonth,       tone: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {pills.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className={`rounded-xl p-4 flex items-center gap-3 ${tone}`}>
          <div className="w-10 h-10 rounded-lg bg-white/40 dark:bg-white/5 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">{value}</p>
            <p className="text-xs font-semibold opacity-80 mt-0.5 leading-tight">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Widget 2 — MyDayWidget
   Inbox sorted by SLA urgency with SLA chip on each row.
   ═══════════════════════════════════════════════════════════════════ */

const SLA_TONE_ORDER: Record<string, number> = { late: 0, warn: 1, ok: 2, neutral: 3, frozen: 4 };

export const MyDayWidget: React.FC<{
  forms: FormRecord[];
  user: UserProfile;
  goToProject: (id: string) => void;
}> = ({ forms, user, goToProject }) => {
  const inbox = useMemo(() => {
    return forms
      .filter(f => formAwaitsUser(f, user))
      .map(f => {
        const def = FORM_BY_CODE[f.code];
        const sla = slaStatus(f.stepStartedAt ?? f.updatedAt, def?.slaDays);
        return { f, sla };
      })
      .sort((a, b) => (SLA_TONE_ORDER[a.sla.tone] ?? 5) - (SLA_TONE_ORDER[b.sla.tone] ?? 5));
  }, [forms, user]);

  const slaBadge = (tone: string, text: string) => {
    if (tone === 'late') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold whitespace-nowrap">{text}</span>;
    if (tone === 'warn') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold whitespace-nowrap">{text}</span>;
    return null;
  };

  return (
    <Card title={`يومي (${inbox.length})`} icon={Inbox} accent="teal">
      {inbox.length === 0 ? (
        <EmptyState icon={CheckCircle} title="لا توجد طلبات معلّقة" />
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {inbox.slice(0, 8).map(({ f, sla }) => (
            <button key={f.id}
              onClick={() => f.projectRefId ? goToProject(f.projectRefId) : undefined}
              className="w-full text-right p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition flex items-center gap-2">
              <Pill tone="purple">{f.code}</Pill>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fg truncate">{f.title}</p>
                <p className="text-[10px] text-fg-muted">{f.beneficiaryName || f.projectId || '—'}</p>
              </div>
              {slaBadge(sla.tone, sla.text)}
              <ArrowLeft className="w-4 h-4 text-fg-faint shrink-0" />
            </button>
          ))}
          {inbox.length > 8 && (
            <p className="text-center text-xs text-fg-muted pt-1">و {inbox.length - 8} طلب آخر…</p>
          )}
        </div>
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Widget 3 — PhaseFunnel
   Vertical funnel bars showing project count per phase in order.
   ═══════════════════════════════════════════════════════════════════ */

const PHASE_ORDER = ['RESEARCH', 'DIAGNOSIS', 'EVACUATION', 'TENDERING', 'EXECUTION', 'HANDOVER'];
const PHASE_LABELS: Record<string, string> = {
  RESEARCH: 'البحث والاعتماد', DIAGNOSIS: 'التشخيص',
  EVACUATION: 'الإخلاء', TENDERING: 'الترسية',
  EXECUTION: 'التنفيذ', HANDOVER: 'الاستلام',
  CLOSED: 'مغلق (مكتمل)', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
};
const PHASE_COLORS: Record<string, string> = {
  RESEARCH: '#0EA5E9', DIAGNOSIS: '#7C3AED', EVACUATION: '#F59E0B',
  TENDERING: '#EAB308', EXECUTION: '#43bba1', HANDOVER: '#16A34A',
  CLOSED: '#6B7280', REJECTED: '#EF4444', CANCELLED: '#9CA3AF',
};

export const PhaseFunnel: React.FC<{ projects: ProjectRecord[] }> = ({ projects }) => {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    projects.forEach(p => { c[p.phase] = (c[p.phase] || 0) + 1; });
    return c;
  }, [projects]);

  const activeTotal = PHASE_ORDER.reduce((s, ph) => s + (counts[ph] || 0), 0);
  const maxActive = Math.max(...PHASE_ORDER.map(ph => counts[ph] || 0), 1);

  if (projects.length === 0) return (
    <Card title="مسار المشاريع" icon={Layers}>
      <EmptyState icon={Building2} title="لا توجد مشاريع بعد" />
    </Card>
  );

  return (
    <Card title="مسار المشاريع" icon={Layers}>
      <div className="space-y-2">
        {PHASE_ORDER.map(ph => {
          const count = counts[ph] || 0;
          const pct = maxActive > 0 ? Math.round((count / maxActive) * 100) : 0;
          return (
            <div key={ph} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-fg-muted text-right shrink-0">{PHASE_LABELS[ph]}</span>
              <div className="flex-1 bg-surface-up rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: count > 0 ? `${Math.max(pct, 8)}%` : '0%', backgroundColor: PHASE_COLORS[ph] }}
                >
                  {count > 0 && <span className="text-white font-bold text-[10px]">{count}</span>}
                </div>
              </div>
              {count === 0 && <span className="text-fg-faint w-4 text-center">—</span>}
            </div>
          );
        })}
      </div>

      {/* Terminal phases */}
      {(['CLOSED', 'REJECTED', 'CANCELLED'] as const).some(ph => counts[ph]) && (
        <>
          <div className="border-t border-subtle my-3" />
          <div className="flex gap-3 flex-wrap">
            {(['CLOSED', 'REJECTED', 'CANCELLED'] as const).map(ph => counts[ph] ? (
              <div key={ph} className="flex items-center gap-1.5 text-xs text-fg-muted">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PHASE_COLORS[ph] }} />
                {PHASE_LABELS[ph]}: <span className="font-bold text-fg">{counts[ph]}</span>
              </div>
            ) : null)}
          </div>
        </>
      )}

      <p className="mt-3 text-[10px] text-fg-faint">{activeTotal} مشروع نشط في المسار</p>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Widget 4 — ActivityTimeline
   Ten most recent form approval events across all forms.
   ═══════════════════════════════════════════════════════════════════ */

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  approved:  { label: 'اعتمد',       color: 'text-green-600 dark:text-green-400' },
  rejected:  { label: 'أعاد للتعديل', color: 'text-orange-500 dark:text-orange-400' },
  deferred:  { label: 'أجّل',         color: 'text-blue-500 dark:text-blue-400' },
  declined:  { label: 'رفض نهائياً',  color: 'text-red-600 dark:text-red-400' },
};

export const ActivityTimeline: React.FC<{
  forms: FormRecord[];
  goToProject: (id: string) => void;
}> = ({ forms, goToProject }) => {
  const events = useMemo(() => {
    return forms
      .flatMap(f =>
        (f.approvals ?? []).map(a => ({ ...a, form: f }))
      )
      .filter(e => e.decision !== undefined)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 10);
  }, [forms]);

  return (
    <Card title="آخر الأنشطة" icon={Activity}>
      {events.length === 0 ? (
        <EmptyState icon={Activity} title="لا توجد أنشطة بعد" />
      ) : (
        <div className="space-y-0 divide-y divide-subtle">
          {events.map((e, i) => {
            const dec = DECISION_LABELS[e.decision] ?? { label: e.decision, color: 'text-fg-muted' };
            return (
              <button key={i}
                onClick={() => e.form.projectRefId ? goToProject(e.form.projectRefId) : undefined}
                className="w-full text-right py-2.5 flex items-start gap-3 hover:bg-surface-up rounded-lg px-1.5 transition group">
                <div className="w-7 h-7 rounded-full bg-surface-up border border-subtle flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5 text-fg-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-fg">{e.actorName}</span>
                    <span className={`text-xs font-bold ${dec.color}`}>{dec.label}</span>
                    <Pill tone="purple">{e.form.code}</Pill>
                  </div>
                  <p className="text-[10px] text-fg-muted truncate mt-0.5">
                    {e.form.beneficiaryName || e.form.projectId || '—'}
                    {e.note ? ` · ${e.note}` : ''}
                  </p>
                </div>
                <span className="text-[10px] text-fg-faint whitespace-nowrap mt-0.5">
                  {formatRelativeTime(e.at)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Widget 5 — SlaBreachHeatmap
   Managers and admins only. Lists pending forms breaching SLA.
   ═══════════════════════════════════════════════════════════════════ */

export const SlaBreachHeatmap: React.FC<{
  forms: FormRecord[];
  user: UserProfile;
  goToProject: (id: string) => void;
}> = ({ forms, user, goToProject }) => {
  const isManager = user.isAdmin || (ROLE_BY_KEY[user.role as RoleKey]?.isManager === true);
  if (!isManager) return null;

  const breaches = useMemo(() => {
    return forms
      .filter(f => f.status === 'pending')
      .map(f => {
        const def = FORM_BY_CODE[f.code];
        const sla = slaStatus(f.stepStartedAt ?? f.updatedAt, def?.slaDays);
        return { f, sla };
      })
      .filter(({ sla }) => sla.tone === 'late' || sla.tone === 'warn')
      .sort((a, b) => {
        if (a.sla.tone !== b.sla.tone) return a.sla.tone === 'late' ? -1 : 1;
        return 0;
      })
      .slice(0, 10);
  }, [forms]);

  const nextRole = (f: FormRecord) => {
    const role = f.approvalChain?.[f.approvalIndex ?? 0];
    return role ? roleName(role) : '—';
  };

  return (
    <Card title="تجاوزات SLA" icon={AlertTriangle} accent="purple">
      {breaches.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 py-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          لا توجد تجاوزات SLA حالياً
        </div>
      ) : (
        <div className="space-y-1.5">
          {breaches.map(({ f, sla }) => (
            <button key={f.id}
              onClick={() => f.projectRefId ? goToProject(f.projectRefId) : undefined}
              className={`w-full text-right px-3 py-2 rounded-lg flex items-center gap-2 transition
                ${sla.tone === 'late'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                }`}>
              {sla.tone === 'late'
                ? <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              <Pill tone="purple">{f.code}</Pill>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fg truncate">{f.beneficiaryName || f.projectId || '—'}</p>
                <p className="text-[10px] text-fg-muted">{nextRole(f)}</p>
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap ${sla.tone === 'late' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {sla.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Widget 6 — BudgetSnapshot
   FINANCE and EXEC departments only. Payment form aggregation.
   ═══════════════════════════════════════════════════════════════════ */

export const BudgetSnapshot: React.FC<{
  forms: FormRecord[];
  user: UserProfile;
}> = ({ forms, user }) => {
  const canView = user.department === 'FINANCE' || user.department === 'EXEC' || user.isAdmin;
  if (!canView) return null;

  const { disbursed, pending, openCount } = useMemo(() => {
    const paymentForms = forms.filter(f => f.code === 'F-15' || f.code === 'F-35');
    let disbursed = 0, pending = 0, openCount = 0;
    for (const f of paymentForms) {
      const amount = Number((f.data as { amount?: number })?.amount || 0);
      if (f.status === 'approved') disbursed += amount;
      else if (f.status === 'pending') { pending += amount; openCount++; }
    }
    return { disbursed, pending, openCount };
  }, [forms]);

  const total = disbursed + pending;
  const disbursedPct = total > 0 ? Math.round((disbursed / total) * 100) : 0;

  return (
    <Card title="لمحة مالية" icon={DollarSign} accent="teal">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-[#43bba1]">{formatCurrency(disbursed)}</p>
          <p className="text-[10px] text-fg-muted mt-0.5">صُرف</p>
        </div>
        <div className="text-center border-x border-subtle">
          <p className="text-lg font-bold text-amber-500">{formatCurrency(pending)}</p>
          <p className="text-[10px] text-fg-muted mt-0.5">معلّق ({openCount} دفعة)</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-fg">{formatCurrency(total)}</p>
          <p className="text-[10px] text-fg-muted mt-0.5">الإجمالي</p>
        </div>
      </div>

      {total > 0 && (
        <div>
          <div className="flex justify-between text-[10px] text-fg-muted mb-1">
            <span>نسبة الصرف</span>
            <span>{disbursedPct}%</span>
          </div>
          <div className="h-2.5 bg-surface-up rounded-full overflow-hidden">
            <div
              className="h-full bg-[#43bba1] rounded-full transition-all duration-700"
              style={{ width: `${disbursedPct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#43bba1]" />صُرف</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />معلّق</span>
          </div>
        </div>
      )}
      {total === 0 && <p className="text-xs text-fg-muted text-center py-2">لا توجد دفعات مسجّلة بعد</p>}
    </Card>
  );
};
