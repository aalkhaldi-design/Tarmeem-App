/**
 * useFirestoreCollection — generic bounded Firestore real-time query hook.
 * The `key` parameter is required: changing it tears down and rebuilds the listener.
 */

import { useEffect, useRef, useState } from 'react';
import { onSnapshot, type Query, type DocumentData } from 'firebase/firestore';

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

export function useFirestoreCollection<T = DocumentData>(
  query: Query | null,
  key: string,
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: query !== null,
    error: null,
  });

  // Track previous key to force listener rebuild on key change
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    prevKey.current = key;
    setState(s => ({ ...s, loading: true, error: null }));

    const unsub = onSnapshot(
      query,
      snap => {
        if (prevKey.current !== key) return; // stale listener
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
        setState({ data, loading: false, error: null });
      },
      err => {
        if (prevKey.current !== key) return;
        setState(s => ({ ...s, loading: false, error: err }));
      },
    );

    return () => {
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
