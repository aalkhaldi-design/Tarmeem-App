/**
 * Settings.tsx — صفحة الإعدادات
 * Three sections: Appearance, Notifications, About.
 * All data comes from App state — no new Firestore queries.
 */

import React, { useState } from 'react';
import {
  Sun, Moon, Bell, BellOff, Info, CheckCircle2, Palette,
} from 'lucide-react';
import { Card, TarmeemLogo, useTheme } from './ui';
import { formatRelativeTime, roleName } from '../lib/data';
import type { UserProfile } from './Auth';

/* ─── AppNotification (mirrors App.tsx interface) ─────────────────── */

interface AppNotification {
  id: string;
  text: string;
  subject?: string;
  type: string;
  link?: string;
  recipients: string[];
  readBy: string[];
  createdAt: string;
}

/* ═══════════════════════════════════════════════════════════════════
   SettingsPage
   ═══════════════════════════════════════════════════════════════════ */

export const SettingsPage: React.FC<{
  user: UserProfile;
  notifications: AppNotification[];
  markAllRead: () => Promise<void>;
}> = ({ user, notifications, markAllRead }) => {
  const { theme, toggle } = useTheme();
  const [marking, setMarking] = useState(false);

  const myNotifs = notifications
    .filter(n => n.recipients.includes(user.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = myNotifs.filter(n => !n.readBy.includes(user.id)).length;

  const handleMarkAll = async () => {
    setMarking(true);
    try { await markAllRead(); } finally { setMarking(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">الإعدادات</h1>
        <p className="text-sm text-fg-muted mt-1">{user.fullName} · {roleName(user.role)}</p>
      </div>

      {/* ── Section 1: Appearance ─────────────────────────────────── */}
      <Card title="المظهر" icon={Palette}>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-bold text-fg">وضع العرض</p>
            <p className="text-xs text-fg-muted mt-0.5">
              {theme === 'dark' ? 'الوضع الليلي مفعّل — خلفية داكنة مناسبة للإضاءة المنخفضة' : 'الوضع النهاري مفعّل — خلفية فاتحة'}
            </p>
          </div>
          <button
            onClick={toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition
              ${theme === 'dark'
                ? 'bg-[#4A1F66] text-white hover:bg-[#3A1652]'
                : 'bg-surface-up border border-subtle text-fg hover:bg-border-subtle'
              }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'التبديل للنهاري' : 'التبديل لليلي'}
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-subtle text-xs text-fg-muted space-y-1">
          <p>الخط: <span className="font-bold text-fg">Tajawal</span> — محسّن للعربية والاتجاه RTL</p>
          <p>اللون الأساسي: <span className="font-bold" style={{ color: '#4A1F66' }}>بنفسجي #4A1F66</span> + <span className="font-bold" style={{ color: '#43bba1' }}>فيروزي #43bba1</span></p>
        </div>
      </Card>

      {/* ── Section 2: Notifications ─────────────────────────────── */}
      <Card title="الإشعارات" icon={Bell}
        accent={unreadCount > 0 ? 'teal' : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-fg-muted">
            {unreadCount > 0
              ? <span className="font-bold text-[#43bba1]">{unreadCount} إشعار غير مقروء</span>
              : 'جميع الإشعارات مقروءة'}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={marking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#43bba1] text-white hover:bg-[#3aa592] disabled:opacity-50 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {marking ? 'جارٍ…' : 'تعليم الكل مقروءاً'}
            </button>
          )}
        </div>

        {myNotifs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-fg-faint py-4 justify-center">
            <BellOff className="w-4 h-4" />
            لا توجد إشعارات بعد
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {myNotifs.slice(0, 20).map(n => {
              const isUnread = !n.readBy.includes(user.id);
              return (
                <div key={n.id}
                  className={`px-3 py-2.5 rounded-lg border text-sm transition
                    ${isUnread
                      ? 'bg-[#43bba1]/10 border-[#43bba1]/30'
                      : 'bg-surface-up border-subtle'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    {isUnread && <span className="w-2 h-2 rounded-full bg-[#43bba1] shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${isUnread ? 'font-bold text-fg' : 'text-fg-muted'}`}>
                        {n.subject || n.text}
                      </p>
                      <p className="text-[10px] text-fg-faint mt-0.5">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Section 3: About ─────────────────────────────────────── */}
      <Card title="حول التطبيق" icon={Info}>
        <div className="flex items-center gap-4 mb-4">
          <TarmeemLogo variant="stacked" size={48} color="auto" animated={false} />
          <div>
            <p className="text-base font-bold text-fg">منصة ترميم للعمليات</p>
            <p className="text-xs text-fg-muted mt-0.5">الإصدار v3.0 — جمعية ترميم الخيرية</p>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-fg-muted border-t border-subtle pt-3">
          <p><span className="font-bold text-fg">المنصة:</span> React 18 + TypeScript + Tailwind CSS</p>
          <p><span className="font-bold text-fg">قاعدة البيانات:</span> Firebase Firestore (Cloud)</p>
          <p><span className="font-bold text-fg">التخزين:</span> Firebase Storage</p>
          <p><span className="font-bold text-fg">النماذج:</span> 22 نموذج عمل عبر 5 مراحل</p>
          <p><span className="font-bold text-fg">الأقسام:</span> 9 أقسام — 24 دوراً وظيفياً</p>
        </div>
      </Card>

    </div>
  );
};
