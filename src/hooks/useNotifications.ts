/**
 * useNotifications — bounded real-time listener for the current user's notifications.
 * Filters server-side by recipients array (Decision 5 — no privacy leak).
 */

import { useMemo } from 'react';
import {
  collection, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirestoreCollection } from './useFirestoreCollection';

export interface AppNotification {
  id: string;
  recipients: string[];
  text: string;
  subject: string;
  type: string;
  link?: string;
  readBy: string[];
  createdAt: string;
}

export function useNotifications(uid: string | null | undefined): AppNotification[] {
  const q = useMemo(() => {
    if (!uid) return null;
    return query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
  }, [uid]);

  const { data } = useFirestoreCollection<AppNotification>(q, uid ? `notifs-${uid}` : 'notifs-null');
  return data;
}
