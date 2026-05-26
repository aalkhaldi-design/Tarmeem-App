/**
 * FormF04.tsx — Assign Diagnosis Engineer
 * Role: HEAD_DIAGNOSIS assigns DIAGNOSIS_ENGINEER + optional فريق الفزعة.
 * Output: project.diagnosisEngineerId via TRIGGER_MAP F-04; F-08 reads data.helpers.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UserCog, Check, AlertTriangle, Users as UsersIcon } from 'lucide-react';
import { FormRenderer, formAwaitsUser } from '../Forms';
import { Card } from '../ui';
import { FormShell } from './FormShell';
import { SearchablePeoplePicker } from './SearchablePeoplePicker';

export const FormF04Renderer: FormRenderer = ({ rec, user, api, users }) => {
  const [engineerId, setEngineerId] = useState<string>((rec.data?.engineerId as string) || '');
  const [helpers, setHelpers] = useState<string[]>((rec.data?.helpers as string[]) || []);
  const awaits = formAwaitsUser(rec, user);
  const isReadOnly = !awaits;

  const diagnosisEngineers = useMemo(
    () => users.filter(u => u.role === 'DIAGNOSIS_ENGINEER' && u.status === 'active'),
    [users],
  );
  // فريق الفزعة pool: active PROJECTS members, EXCLUDING admins,
  // مدير إدارة المشاريع (PROJECTS_MANAGER), and the chosen engineer.
  const helperPool = useMemo(
    () => users.filter(u =>
      u.department === 'PROJECTS' && u.status === 'active' &&
      !u.isAdmin && u.role !== 'PROJECTS_MANAGER' && u.id !== engineerId),
    [users, engineerId],
  );
  const selectedEngineer = diagnosisEngineers.find(e => e.id === engineerId);

  useEffect(() => {
    if (!engineerId || isReadOnly) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { engineerId, helpers }); }, 500);
    return () => clearTimeout(t);
  }, [engineerId, helpers, isReadOnly]);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد التعيين">
      <Card title="تعيين مهندس التشخيص" icon={UserCog}>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
          اختر مهندس التشخيص المسؤول عن هذا المشروع.
        </p>

        <label className="block text-xs font-bold text-fg-muted mb-1">مهندس التشخيص</label>
        <SearchablePeoplePicker
          people={diagnosisEngineers}
          selected={engineerId ? [engineerId] : []}
          onChange={ids => setEngineerId(ids[0] || '')}
          multi={false}
          placeholder="ابحث واختر مهندس التشخيص (بالاسم أو البريد)"
          disabled={isReadOnly}
        />

        {selectedEngineer && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-800 border border-[#43bba1] rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-[#43bba1]">{selectedEngineer.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{selectedEngineer.email}</p>
            </div>
            <Check className="w-5 h-5 text-[#43bba1]" />
          </div>
        )}

        {diagnosisEngineers.length === 0 && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> لا يوجد مهندسو تشخيص نشطون في النظام.
          </p>
        )}

        {awaits && !engineerId && diagnosisEngineers.length > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> اختر مهندس التشخيص قبل الاعتماد.
          </p>
        )}

        <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-3">
          <p className="text-xs font-bold text-gray-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
            <UsersIcon className="w-3.5 h-3.5" /> فريق الفزعة (مساعدون اختياريون)
          </p>
          <SearchablePeoplePicker
            people={helperPool}
            selected={helpers}
            onChange={setHelpers}
            multi={true}
            placeholder="ابحث واختر فريق الفزعة (بالاسم أو البريد)"
            disabled={isReadOnly}
          />
        </div>
      </Card>
    </FormShell>
  );
};
