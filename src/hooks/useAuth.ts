/**
 * useAuth — wraps Firebase onAuthStateChanged + Firestore user profile fetch.
 * Returns { firebaseUser, userProfile, loading }.
 *
 * Note: App.tsx currently manages this logic inline for historical reasons.
 * New code should import from here; App.tsx will migrate to this hook in a
 * future refactor pass.
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../components/Auth';

interface AuthState {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) {
        setState({ firebaseUser: null, userProfile: null, loading: false });
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        const profile = snap.exists() ? (snap.data() as UserProfile) : null;
        setState({ firebaseUser: fbUser, userProfile: profile, loading: false });
      } catch {
        setState({ firebaseUser: fbUser, userProfile: null, loading: false });
      }
    });
    return unsub;
  }, []);

  return state;
}
