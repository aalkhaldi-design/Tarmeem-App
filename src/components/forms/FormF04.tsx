/**
 * FormF04.tsx — Assign Diagnosis Engineer
 * Phase: Post-F-03 Approval
 * Role: HEAD_DIAGNOSIS assigns DIAGNOSIS_ENGINEER
 * Output: Sets project.diagnosisEngineerId via TRIGGER_MAP F-04 entry
 */

import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import type { SharedFormProps } from './_shared';
import { canApproveForm } from './_shared';

export function FormF04Renderer(props: SharedFormProps) {
  const { rec, user, onClose, onApprove, users, isBusy } = props;
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>(
    (rec.data?.engineerId as string) || ''
  );
  const [approvalNote, setApprovalNote] = useState('');

  const diagnosisEngineers = useMemo(
    () => users.filter(u => u.role === 'DIAGNOSIS_ENGINEER' && u.status === 'active'),
    [users]
  );

  const selectedEngineer = diagnosisEngineers.find(e => e.id === selectedEngineerId);
  const canApprove = canApproveForm(rec, user);
  const isApproved = rec.status === 'approved';

  const handleApprove = async () => {
    if (!selectedEngineerId) {
      alert('الرجاء اختيار مهندس تشخيص');
      return;
    }
    const engineer = diagnosisEngineers.find(e => e.id === selectedEngineerId);
    if (!engineer) return;
    await onApprove(approvalNote, { engineerId: selectedEngineerId });
  };

  return (
    <div className="bg-white dark:bg-[#050505] text-gray-900 dark:text-white p-6 rounded-lg space-y-6" dir="rtl">
      {/* Header */}
      <div className="border-b border-[#43bba1]/30 pb-4">
        <h2 className="text-xl font-bold text-[#43bba1]">تعيين مهندس التشخيص</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          اختر مهندس التشخيص المسؤول عن هذا المشروع
        </p>
      </div>

      {/* Current Selection */}
      {selectedEngineer && (
        <div className="bg-gray-50 dark:bg-[#1a1a1a] border border-[#43bba1] rounded p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">المهندس المختار:</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#43bba1]">{selectedEngineer.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedEngineer.email}</p>
            </div>
            <Check className="w-5 h-5 text-[#43bba1]" />
          </div>
        </div>
      )}

      {/* Engineer Selection */}
      <div>
        <label className="block text-sm font-bold text-[#43bba1] mb-3">
          اختر مهندس التشخيص
        </label>
        <select
          value={selectedEngineerId}
          onChange={e => setSelectedEngineerId(e.target.value)}
          disabled={isApproved || !canApprove}
          className="w-full bg-gray-100 dark:bg-[#111] border border-[#43bba1]/50 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#43bba1] focus:outline-none disabled:opacity-50"
        >
          <option value="">-- اختر مهندس --</option>
          {diagnosisEngineers.map(eng => (
            <option key={eng.id} value={eng.id}>
              {eng.fullName} ({eng.email})
            </option>
          ))}
        </select>
        {diagnosisEngineers.length === 0 && (
          <p className="text-xs text-red-600 mt-1">لا يوجد مهندسو تشخيص نشطون في النظام</p>
        )}
      </div>

      {/* Approval Note */}
      {canApprove && !isApproved && (
        <div>
          <label className="block text-sm font-bold text-[#43bba1] mb-2">ملاحظات الاعتماد</label>
          <textarea
            value={approvalNote}
            onChange={e => setApprovalNote(e.target.value)}
            placeholder="أضف ملاحظة (اختياري)"
            className="w-full bg-gray-100 dark:bg-[#111] border border-[#43bba1]/50 rounded px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-[#43bba1] focus:outline-none"
            rows={3}
          />
        </div>
      )}

      {/* Status Badge */}
      <div className="bg-gray-50 dark:bg-[#1a1a1a] border border-[#43bba1]/30 rounded p-3 flex items-center gap-2">
        <div className="w-2 h-2 bg-[#43bba1] rounded-full" />
        <span className="text-xs text-gray-600 dark:text-gray-300">
          الحالة: {isApproved ? 'معتمد' : 'بانتظار الاعتماد'}
        </span>
      </div>

      {/* Action Buttons */}
      {canApprove && !isApproved && (
        <div className="flex gap-3 pt-4 border-t border-[#43bba1]/30">
          <button
            onClick={handleApprove}
            disabled={!selectedEngineerId || isBusy}
            className="flex-1 bg-[#43bba1] hover:bg-[#3aa892] disabled:opacity-50 text-white font-bold py-2 rounded transition"
          >
            {isBusy ? 'جارٍ...' : 'اعتماد التعيين'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#502b79] hover:bg-[#652d8f] text-white font-bold py-2 rounded transition"
          >
            إغلاق
          </button>
        </div>
      )}

      {isApproved && (
        <button
          onClick={onClose}
          className="w-full bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-[#222] text-gray-700 dark:text-gray-300 font-bold py-2 rounded transition"
        >
          إغلاق
        </button>
      )}
    </div>
  );
}
