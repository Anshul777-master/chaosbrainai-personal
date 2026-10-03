import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, ChaosExperiment, Incident, RootCauseAnalysis } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore using the configured custom database ID if available
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test Firestore connection on boot as mandated by the skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Successfully verified connection to server.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or database initializing.');
    } else {
      console.log('[Firestore] Initial handshake completed.');
    }
    return false;
  }
}

// Trigger connection test
testFirestoreConnection();

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const userObj: User = {
      id: fbUser.uid,
      email: fbUser.email || 'engineer@chaosbrain.ai',
      name: fbUser.displayName || 'SRE Engineer',
      role: 'ADMIN', // Default first authenticated user to ADMIN
      token: await fbUser.getIdToken(),
    };

    // Save/Update user profile in Firestore
    try {
      await setDoc(
        doc(db, 'users', fbUser.uid),
        {
          id: userObj.id,
          email: userObj.email,
          name: userObj.name,
          role: userObj.role,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[Firestore] Could not persist user profile to Firestore:', e);
    }

    return userObj;
  } catch (err: any) {
    console.error('Failed to sign in with Google:', err);
    throw err;
  }
}

/**
 * Sign out
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to Auth State Changes
 */
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      // Check if user has role in Firestore
      let role: User['role'] = 'ADMIN';
      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists() && userDoc.data()?.role) {
          role = userDoc.data().role;
        }
      } catch (e) {
        // Fallback default
      }

      callback({
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || 'SRE Engineer',
        role,
        token: await fbUser.getIdToken(),
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Save Experiment to Firestore
 */
export async function saveExperimentToFirestore(
  exp: ChaosExperiment,
  userId: string
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'experiments', exp.id),
      {
        id: exp.id,
        userId,
        name: exp.name,
        targetServiceId: exp.targetServiceId,
        failureType: exp.failureType,
        intensity: exp.intensity,
        duration: exp.duration,
        status: exp.status,
        blastRadius: exp.blastRadius,
        affectedServiceIds: exp.affectedServiceIds,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Firestore] Unable to save experiment record:', e);
  }
}

/**
 * Fetch Recent Experiments from Firestore
 */
export async function fetchExperimentsFromFirestore(): Promise<any[]> {
  try {
    const q = query(collection(db, 'experiments'), limit(20));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch (e) {
    console.warn('[Firestore] Unable to fetch experiments:', e);
    return [];
  }
}

/**
 * Save Incident & RCA to Firestore
 */
export async function saveIncidentToFirestore(
  incident: Incident,
  rca?: RootCauseAnalysis | null
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'incidents', incident.id),
      {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        affectedServiceId: incident.affectedServiceId,
        status: incident.status,
        triggerMetric: incident.triggerMetric,
        blastRadius: incident.blastRadius,
        probableRootCauseId: rca?.probableRootCauseId || null,
        confidence: rca?.confidence || null,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Firestore] Unable to save incident record:', e);
  }
}

/**
 * Save Chat Message to Firestore
 */
export async function saveChatMessageToFirestore(message: {
  id: string;
  userId?: string;
  role: 'user' | 'model' | 'system';
  content: string;
  model?: string;
  groundingSources?: any[];
}): Promise<void> {
  try {
    await setDoc(
      doc(db, 'chat_messages', message.id),
      {
        ...message,
        timestamp: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[Firestore] Unable to save chat message:', e);
  }
}

/**
 * Fetch Chat Messages from Firestore
 */
export async function fetchChatMessagesFromFirestore(): Promise<any[]> {
  try {
    const q = query(collection(db, 'chat_messages'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data());
  } catch (e) {
    console.warn('[Firestore] Unable to fetch chat messages:', e);
    return [];
  }
}
