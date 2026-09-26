import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Provider with Meet & Profile scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/meetings.space.created');
googleProvider.addScope('https://www.googleapis.com/auth/meetings.space.readonly');

let inMemoryAccessToken: string | null = null;

export function getCachedAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    inMemoryAccessToken = null;
  }
});

export async function signInWithGoogle(): Promise<{ user: User; accessToken: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    if (token) {
      setCachedAccessToken(token);
    }
    return { user: result.user, accessToken: token };
  } catch (err) {
    console.error('Google Sign-in error:', err);
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
  setCachedAccessToken(null);
}

// Data models
export interface AddressRegistration {
  id: string;
  name?: string; // Place name / Building name / Business name
  category?: string; // Residential, Commercial, Landmark, etc.
  formattedAddress: string;
  addressLines: string[];
  regionCode: string;
  lat: number;
  lng: number;
  granularity: string;
  complete: boolean;
  hasUnconfirmedComponents: boolean;
  verdictSummary: string;
  notes?: string;
  photos: string[]; // Base64 or download URLs
  googleSubmissionPayload?: {
    placeName: string;
    category: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    officialGoogleMapsContributeUrl: string;
    status: 'PENDING_GOOGLE_REVIEW' | 'VERIFIED_LOCALLY';
  };
  meetUri?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  createdAt: string;
  updatedAt?: string;
}

// Firestore operations
export async function saveAddressToFirestore(data: AddressRegistration): Promise<void> {
  const docRef = doc(db, 'submissions', data.id);
  await setDoc(docRef, data, { merge: true });
}

export async function getUserAddresses(userId: string): Promise<AddressRegistration[]> {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const list: AddressRegistration[] = [];
    snap.forEach((docItem) => {
      list.push(docItem.data() as AddressRegistration);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching user addresses, falling back to all:', err);
    return getAllAddresses();
  }
}

export async function getAllAddresses(): Promise<AddressRegistration[]> {
  try {
    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: AddressRegistration[] = [];
    snap.forEach((docItem) => {
      list.push(docItem.data() as AddressRegistration);
    });
    return list;
  } catch (err) {
    console.error('Error fetching all addresses:', err);
    return [];
  }
}

// Aliases for AdminView compatibility
export const getSubmissionsFromFirestore = getAllAddresses;
export const deleteSubmissionFromFirestore = deleteAddressFromFirestore;

export async function deleteAddressFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, 'submissions', id);
  await deleteDoc(docRef);
}

// Upload building photo helper (base64 fallback / storage)
export async function uploadBuildingPhoto(id: string, base64Data: string): Promise<string> {
  try {
    const path = `building_photos/${id}_${Date.now()}.jpg`;
    const imageRef = storageRef(storage, path);
    // Data URL upload
    await uploadString(imageRef, base64Data, 'data_url');
    const downloadUrl = await getDownloadURL(imageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload failed or not enabled, using inline image:', err);
    return base64Data;
  }
}
