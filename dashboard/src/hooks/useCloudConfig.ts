import { useState, useEffect } from 'react';
import { db, auth, doc, onSnapshot, setDoc } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface LinkTapConfig {
  username: string;
  apiKey: string;
  gatewayId: string;
  taplinkerId: string;
}

export interface CloudConfig {
  linktap?: LinkTapConfig;
  [key: string]: any;
}

export function useCloudConfig() {
  const [config, setConfig] = useState<CloudConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = undefined;
      }

      if (!user) {
        setConfig(null);
        setLoading(false);
        return;
      }

      const docRef = doc(db, 'users', user.uid);
      unsubscribeSnapshot = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setConfig(snap.data() as CloudConfig);
        } else {
          setConfig({});
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching cloud config:", error);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const updateConfig = async (newConfig: Partial<CloudConfig>) => {
    if (!auth.currentUser) throw new Error('Must be logged in to update config');
    const docRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(docRef, newConfig, { merge: true });
  };

  return { config, updateConfig, loading };
}
