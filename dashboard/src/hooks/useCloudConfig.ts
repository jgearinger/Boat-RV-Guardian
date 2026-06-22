import { useState, useEffect } from 'react';
import { db, auth, doc, onSnapshot, setDoc } from '../services/firebase';
import { collection, query, where, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface UserConfig {
  accessibleVehicles: string[];
  activeVehicleId: string;
}

export function useCloudConfig(activeVid: string | null) {
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [activeVehicleConfig, setActiveVehicleConfig] = useState<Record<string, any> | null>(null);
  const [cloudVehicles, setCloudVehicles] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to user document and accessible vehicles
  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeVehicles: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = undefined;
      }
      if (unsubscribeVehicles) {
        unsubscribeVehicles();
        unsubscribeVehicles = undefined;
      }

      if (!user) {
        setUserConfig(null);
        setActiveVehicleConfig(null);
        setCloudVehicles([]);
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      unsubscribeUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setUserConfig(snap.data() as UserConfig);
        } else {
          setUserConfig({ accessibleVehicles: [], activeVehicleId: '' });
        }
      });

      const q = query(collection(db, 'vehicles'), where('allowedUsers', 'array-contains', user.uid));
      unsubscribeVehicles = onSnapshot(q, (snapshot: any) => {
        const vehicles: Record<string, any>[] = [];
        snapshot.forEach((doc: any) => {
          vehicles.push({ id: doc.id, ...doc.data() });
        });
        setCloudVehicles(vehicles);
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeVehicles) unsubscribeVehicles();
    };
  }, []);

  // Subscribe to active vehicle document
  useEffect(() => {
    if (!activeVid) {
      setActiveVehicleConfig(null);
      return;
    }
    
    const vehicleRef = doc(db, 'vehicles', activeVid);
    const unsubscribeVehicle = onSnapshot(vehicleRef, (snap) => {
      if (snap.exists()) {
        setActiveVehicleConfig(snap.data());
      } else {
        setActiveVehicleConfig({});
      }
    });

    return () => unsubscribeVehicle();
  }, [activeVid]);

  const updateUserConfig = async (newConfig: Partial<UserConfig>) => {
    if (!auth.currentUser) throw new Error('Must be logged in');
    const docRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(docRef, newConfig, { merge: true });
  };

  const updateVehicleConfig = async (vid: string, newConfig: Record<string, any>) => {
    if (!auth.currentUser) throw new Error('Must be logged in');
    const docRef = doc(db, 'vehicles', vid);
    await setDoc(docRef, {
      ...newConfig,
      allowedUsers: arrayUnion(auth.currentUser.uid)
    }, { merge: true });
  };

  return { userConfig, activeVehicleConfig, cloudVehicles, updateUserConfig, updateVehicleConfig, loading };
}
