import React, { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '../ui';

export interface TitledFile { name: string; title: string; url?: string; size?: number; uploadedAt?: string; driveId?: string; viewUrl?: string }

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // keep under Netlify's ~6MB function payload after base64

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch { return file; }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(blob);
  });
}

export const TitledFileUploader: React.FC<{
  files: TitledFile[];
  onChange: (files: TitledFile[]) => void;
  pathPrefix: string;
  disabled?: boolean;
}> = ({ files, onChange, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true); setError(null);
    try {
      const added: TitledFile[] = [];
      for (const file of Array.from(fileList)) {
        const blob = await compressImage(file);
        if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`الملف "${file.name}" كبير جداً (الحد ٤ ميجابايت بعد الضغط).`);
        const dataBase64 = await blobToBase64(blob);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 90000);
        let res: Response;
        try {
          res = await fetch('/.netlify/functions/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, mimeType: file.type || 'application/octet-stream', dataBase64 }),
            signal: controller.signal,
          });
        } finally { clearTimeout(timer); }
        if (!res.ok) {
          let msg = 'فشل رفع الملف';
          try { const j = await res.json(); if (j && j.error) msg = j.error; } catch { /* ignore */ }
          throw new Error(msg);
        }
        const j = await res.json();
        const viewUrl = `/.netlify/functions/file?id=${encodeURIComponent(j.driveId)}`;
        added.push({ name: file.name, title: file.name, url: viewUrl, viewUrl, driveId: j.driveId, size: blob.size, uploadedAt: new Date().toISOString() });
      }
      onChange([...files, ...added]);
    } catch (e) {
      console.error('upload failed:', e);
      setError(e instanceof Error ? e.message : 'فشل رفع الملف');
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-2 w-full p-2 rounded-lg border border-subtle bg-surface-up">
          <Input className="flex-1" placeholder="عنوان المستند" value={f.title} readOnly={disabled}
            onChange={e => onChange(files.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
          {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#43bba1] hover:underline shrink-0">عرض</a>}
          {!disabled && (
            <button type="button" onClick={() => onChange(files.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {error && <p className="text-[11px] text-red-600 dark:text-red-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
      {!disabled && (
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#56B894] text-white text-xs font-bold cursor-pointer">
          <Plus className="w-3 h-3" /> {uploading ? 'جارٍ الرفع…' : 'إضافة ملف'}
          <input type="file" multiple className="hidden" disabled={uploading} onChange={e => { handleAdd(e.target.files); e.target.value = ''; }} />
        </label>
      )}
    </div>
  );
};
