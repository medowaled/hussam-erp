/**
 * Hussam ERP — Firebase (Firestore) Connection
 * ------------------------------------------------------------------
 * اتبع هذه الخطوات في متصفحك ثم ضع القيم مكان PASTE_...
 * 1) افتح https://console.firebase.google.com وسجّل الدخول
 * 2) أنشئ مشروع جديد: Add project → سمّيه (مثال: hussam-erp)
 * 3) من القائمة الجانبية: Build → Firestore Database → Create database
 *    (اختر Production mode أو Test mode — كافٍ للتجربة)
 * 4) من Project settings (أيقونة الترس) → General → Your apps
 *    → اضغط أيقونة الويب (</>) → سجّل التطبيق باسم (hussam-erp-web)
 * 5) انسخ كائن firebaseConfig الذي يظهر وانقل قيمه هنا
 * 6) أعد رفع الموقع على GitHub — وسيعمل كل شيء تلقائياً
 */

export const firebaseConfig = {
    apiKey: 'AIzaSyCsjEZ_Acd9-WZo1xcvkiOdCYB1DYdDByU',
    authDomain: 'hussam-erp.firebaseapp.com',
    projectId: 'hussam-erp',
    storageBucket: 'hussam-erp.firebasestorage.app',
    messagingSenderId: '548776642415',
    appId: '1:548776642415:web:35eb43e3146a82cd128a9a',
    measurementId: 'G-DMZBBRVTS7'
};

const FIRESTORE_COLLECTION = 'appData';

let db = null;

/**
 * Returns the Firestore database instance, or null when the SDK is not
 * loaded / config is not filled yet (the app then falls back to localStorage).
 */
export function getFirestoreDB() {
    if (typeof window === 'undefined' || typeof window.firebase === 'undefined') {
        return null;
    }
    if (!db) {
        try {
            const app = window.firebase.initializeApp(firebaseConfig);
            db = window.firebase.firestore(app);
        } catch (e) {
            console.error('Firebase init error (تأكد من ملء firebaseConfig):', e);
            return null;
        }
    }
    return db;
}

/** Write one storage key into Firestore (document = key name). */
export async function pushToFirestore(key, value) {
    const database = getFirestoreDB();
    if (!database) return false;
    try {
        await database.collection(FIRESTORE_COLLECTION).doc(key).set({
            data: value,
            updatedAt: Date.now()
        });
        return true;
    } catch (e) {
        console.error('Firestore write error:', e);
        return false;
    }
}

/** Read one storage key from Firestore (null when missing or offline). */
export async function pullFromFirestore(key) {
    const database = getFirestoreDB();
    if (!database) return null;
    try {
        const doc = await database.collection(FIRESTORE_COLLECTION).doc(key).get();
        return doc.exists ? doc.data().data : null;
    } catch (e) {
        console.error('Firestore read error:', e);
        return null;
    }
}

/**
 * Subscribe to real-time changes across the entire Firestore collection.
 * This guarantees instantaneous synchronization between Admin and Delegates.
 */
export function subscribeToFirestore(onDocumentChange) {
    const database = getFirestoreDB();
    if (!database) return null;
    try {
        return database.collection(FIRESTORE_COLLECTION).onSnapshot(
            snapshot => {
                snapshot.docChanges().forEach(change => {
                    const key = change.doc.id;
                    const docData = change.doc.data();
                    if (docData && docData.data !== undefined) {
                        onDocumentChange(key, docData.data, docData.updatedAt || 0, change.type);
                    }
                });
            },
            err => {
                console.warn('Firestore real-time sync subscription error:', err);
            }
        );
    } catch (e) {
        console.warn('Failed to initialize Firestore real-time subscription:', e);
        return null;
    }
}

