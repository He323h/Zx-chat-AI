import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

export interface StrangerQueueEntry {
  uid: string;
  joinedAt: Timestamp;
  status: 'waiting' | 'matched';
  sessionId?: string;
}

export interface StrangerSession {
  user1: string;
  user2: string;
  status: 'active' | 'ended';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface StrangerMessage {
  id: string;
  uid: string;
  text: string;
  timestamp: Timestamp;
  isSystem?: boolean;
}

const SESSION_DURATION_SECONDS = 180;

export async function joinQueue(db: Firestore, uid: string): Promise<string | null> {
  const queueRef = collection(db, 'strangerQueue');
  const myDocRef = doc(db, 'strangerQueue', uid);

  try {
    return await runTransaction(db, async (tx) => {
      // Look for another waiting user
      const waitingSnap = await getDocs(
        query(queueRef, where('status', '==', 'waiting'), limit(5))
      );
      const partner = waitingSnap.docs.find(d => d.id !== uid);

      if (partner) {
        const partnerId = partner.id;
        const now = Timestamp.now();
        const expiresAt = new Timestamp(now.seconds + SESSION_DURATION_SECONDS, 0);

        // Create a session
        const sessionRef = doc(collection(db, 'strangerSessions'));
        tx.set(sessionRef, {
          user1: partnerId,
          user2: uid,
          status: 'active',
          createdAt: now,
          expiresAt,
        });

        // Mark partner as matched
        tx.update(doc(db, 'strangerQueue', partnerId), {
          status: 'matched',
          sessionId: sessionRef.id,
        });

        // Mark me as matched
        tx.set(myDocRef, {
          uid,
          joinedAt: now,
          status: 'matched',
          sessionId: sessionRef.id,
        });

        return sessionRef.id;
      } else {
        // No partner found — join queue and wait
        tx.set(myDocRef, {
          uid,
          joinedAt: Timestamp.now(),
          status: 'waiting',
        });
        return null;
      }
    });
  } catch (err) {
    console.error('[Stranger] joinQueue failed:', err);
    // Fallback: just add to queue
    await setDoc(myDocRef, {
      uid,
      joinedAt: serverTimestamp(),
      status: 'waiting',
    });
    return null;
  }
}

export function watchMyQueueEntry(
  db: Firestore,
  uid: string,
  onMatch: (sessionId: string) => void
): Unsubscribe {
  const myDocRef = doc(db, 'strangerQueue', uid);
  return onSnapshot(myDocRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as StrangerQueueEntry;
    if (data.status === 'matched' && data.sessionId) {
      onMatch(data.sessionId);
    }
  });
}

export async function leaveQueue(db: Firestore, uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'strangerQueue', uid));
  } catch {}
}

export async function getSession(db: Firestore, sessionId: string): Promise<StrangerSession | null> {
  const snap = await getDoc(doc(db, 'strangerSessions', sessionId));
  if (!snap.exists()) return null;
  return snap.data() as StrangerSession;
}

export function watchSession(
  db: Firestore,
  sessionId: string,
  onChange: (session: StrangerSession) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'strangerSessions', sessionId), (snap) => {
    if (snap.exists()) onChange(snap.data() as StrangerSession);
  });
}

export async function endSession(db: Firestore, sessionId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'strangerSessions', sessionId), { status: 'ended' });
  } catch {}
}

export function watchMessages(
  db: Firestore,
  sessionId: string,
  onMessages: (msgs: StrangerMessage[]) => void
): Unsubscribe {
  const msgRef = collection(db, 'strangerSessions', sessionId, 'messages');
  return onSnapshot(
    query(msgRef, orderBy('timestamp', 'asc')),
    (snap) => {
      const msgs: StrangerMessage[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<StrangerMessage, 'id'>),
      }));
      onMessages(msgs);
    }
  );
}

export async function sendMessage(
  db: Firestore,
  sessionId: string,
  uid: string,
  text: string
): Promise<void> {
  const msgRef = collection(db, 'strangerSessions', sessionId, 'messages');
  await addDoc(msgRef, {
    uid,
    text,
    timestamp: serverTimestamp(),
  });
}

export async function sendSystemMessage(
  db: Firestore,
  sessionId: string,
  text: string
): Promise<void> {
  const msgRef = collection(db, 'strangerSessions', sessionId, 'messages');
  await addDoc(msgRef, {
    uid: 'system',
    text,
    timestamp: serverTimestamp(),
    isSystem: true,
  });
}

export async function deleteSessionMessages(db: Firestore, sessionId: string): Promise<void> {
  const msgRef = collection(db, 'strangerSessions', sessionId, 'messages');
  const snap = await getDocs(msgRef);
  const deletes = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletes);
}

export async function submitReport(
  db: Firestore,
  reporterId: string,
  reportedId: string,
  sessionId: string,
  reason: string,
  messages: StrangerMessage[]
): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    reporterId,
    reportedId,
    sessionId,
    reason,
    messages: messages.map(m => ({ uid: m.uid, text: m.text })),
    createdAt: serverTimestamp(),
  });
}
