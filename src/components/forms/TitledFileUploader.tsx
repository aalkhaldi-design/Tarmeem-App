import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '../ui';

export interface TitledFile { name: string; title: string; url?: string; size?: number; uploadedAt?: string }

export const TitledFileUploader: React.FC<{
  files: TitledFile[];
  onChange: (files: TitledFile[]) => void;
  pathPrefix: string;
  disabled?: boolean;
}> = ({ files, onChange, pathPrefix, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true); setError(null);
    try {
      const added: TitledFile[] = [];
      for (const file of Array.from(fileList)) {
        const sRef = ref(storage, `${pathPrefix}/${crypto.randomUUID()}/${file.name}`);
        await Promise.race([
          uploadBytes(sRef, file),
          new Promise((_, rej) => setTimeout(() => rej(new Error('انتهت مهلة الرفع — تحقق من تفعيل Firebase Storage والاتصال')), 60000)),
        ]);
        const url = await getDownloadURL(sRef);
        added.push({ name: file.name, title: file.name, url, size: file.size, uploadedAt: new Date().toISOString() });
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
