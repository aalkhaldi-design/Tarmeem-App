/* useFormDraft — drop-in replacement for useState that persists every change
   to Firestore (debounced ~700ms) so a page refresh restores all fields.
   - If a FormRecord already exists for this form, writes go to forms/{id}.data.
   - Otherwise, writes go to projects/{id}.formDrafts[key]. On submit the form's
     own onSubmit handler will call api.createForm which copies the draft into a
     real FormRecord; the draft survives multiple refreshes meanwhile. */

import { useEffect, useRef, useState } from 'react';
import type { FormsApi, FormRecord } from '../../Forms';
import type { UserProfile } from '../../Auth';
import type { ProjectRecord } from '../../forms/FormRenderers';

interface UseFormDraftArgs<T> {
  api: FormsApi;
  user: UserProfile;
  project: ProjectRecord;
  rec: FormRecord | undefined;
  /** key under projects/{id}.formDrafts (usually FormCode; for F-14 use `F-14-seq-${n}`) */
  draftKey: string;
  initial: T;
  /** If true (default) the hook hydrates from rec.data or project.formDrafts[key]. */
  hydrate?: boolean;
  /** debounce in ms — default 700 */
  debounceMs?: number;
}

export function useFormDraft<T extends object>({
  api, user, project, rec, draftKey, initial, hydrate = true, debounceMs = 700,
}: UseFormDraftArgs<T>): [T, React.Dispatch<React.SetStateAction<T>>] {
  const startingValue = (() => {
    if (!hydrate) return initial;
    if (rec?.data && typeof rec.data === 'object') return { ...initial, ...rec.data } as T;
    const draft = project.formDrafts?.[draftKey];
    if (draft && typeof draft === 'object') return { ...initial, ...draft } as T;
    return initial;
  })();

  const [state, setState] = useState<T>(startingValue);
  const stateRef = useRef<T>(state);
  stateRef.current = state;
  const timerRef = useRef<number | null>(null);
  const skipNextPersistRef = useRef(true); // skip first auto-save on mount

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const snapshot = stateRef.current;
      if (rec) {
        api.updateFormData(rec.id, snapshot as Record<string, any>).catch(e => console.error('useFormDraft.updateFormData:', e));
      } else {
        api.saveDraft(project.id, draftKey, snapshot as Record<string, any>, user).catch(e => console.error('useFormDraft.saveDraft:', e));
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [state, api, project.id, draftKey, rec, user, debounceMs]);

  return [state, setState];
}
