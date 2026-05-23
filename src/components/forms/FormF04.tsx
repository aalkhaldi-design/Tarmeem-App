/**
 * FormF04.tsx — Assign Diagnosis Engineer
 * Phase: Post-F-03 Approval
 * Role: HEAD_DIAGNOSIS assigns DIAGNOSIS_ENGINEER
 * Output: Sets project.diagnosisEngineerId via TRIGGER_MAP F-04 entry
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UserCog, Check, AlertTriangle } from 'lucide-react';
import { FormRenderer, formAwaitsUser } from '../Forms';
import { Card, Select } from '../ui';
import { FormShell } from './FormShell';

export const FormF04Renderer: FormRenderer = ({ rec, user, api, users }) => {
  const [engineerId, setEngineerId] = useState<string>((rec.data?.engineerId as string) || '');
  const awaits = formAwaitsUser(rec, user);
  const isReadOnly = !awaits;

  const diagnosisEngineers = useMemo(
    () => users.filter(u => u.role === 'DIAGNOSIS_ENGINEER' && u.status === 'active'),
    [users],
  );
  const selectedEngineer = diagnosisEngineers.find(e => e.id === engineerId);

  // Persist the pick to form.data before approval — the F-04 trigger reads
  // approvedRecord.data.engineerId, and ApprovalActions approves with no dataPatch.
  useEffect(() => {
    if (!engineerId || isReadOnly) return;
    const t = setTimeout(() => { api.updateFormData(rec.id, { engineerId }); }, 500);
    return () => clearTimeout(t);
  }, [engineerId, isReadOnly]);

  return (
    <FormShell rec={rec} user={user} api={api} approveLabel="اعتماد التعيين">
      <Card title="تعيين مهندس التشخيص" icon={UserCog}>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
          اختر مهندس التشخيص المسؤول عن هذا المشروع.
        </p>

        <Select
          label="مهندس التشخيص"
          value={engineerId}
          onChange={e => setEngineerId(e.target.value)}
          readOnly={isReadOnly}
          options={diagnosisEngineers.map(e => ({ value: e.id, label: `${e.fullName} (${e.email})` }))}
          placeholder="— اختر مهندس —"
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
      </Card>
    </FormShell>
  );
};
