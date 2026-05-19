/**
 * migrations.ts — One-shot Firestore data migrations.
 *
 * Run from the Admin panel or a migration script. Each function is idempotent
 * (safe to run twice). Never called automatically on startup.
 */

import {
  collection, getDocs, doc, updateDoc, deleteField, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * migrateF20Messages — converts legacy F-20 inline messages[] to flat note fields.
 *
 * Old shape: form.data.messages = [{ type: 'direct'|'inkind'|'partnership', text, createdAt }]
 * New shape: form.data.f20_directNotes, f20_inkindNotes, f20_partnershipNotes (strings)
 *
 * Returns the number of documents migrated.
 */
export async function migrateF20Messages(): Promise<number> {
  const snap = await getDocs(collection(db, 'forms'));
  let count = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.code !== 'F-20') continue;
    const messages: Array<{ type: string; text: string; createdAt?: unknown }> =
      data.data?.messages || [];
    if (!messages.length) continue;

    const direct      = messages.filter(m => m.type === 'direct').map(m => m.text).join('\n');
    const inkind      = messages.filter(m => m.type === 'inkind').map(m => m.text).join('\n');
    const partnership = messages.filter(m => m.type === 'partnership').map(m => m.text).join('\n');

    await updateDoc(doc(db, 'forms', docSnap.id), {
      'data.f20_directNotes':      direct      || deleteField(),
      'data.f20_inkindNotes':      inkind      || deleteField(),
      'data.f20_partnershipNotes': partnership || deleteField(),
      'data.messages':             deleteField(),
    });
    count++;
  }

  return count;
}

/**
 * Helper: convert a JS Date or string to a Firestore Timestamp.
 * Preserves original ordering when migrating legacy createdAt strings.
 */
export function toTimestamp(value: string | Date | null | undefined): Timestamp | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}
