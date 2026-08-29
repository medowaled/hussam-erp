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
    apiKey: 'AIzaSyDn2tBn6uUGNY-lzxePGPFwShfSawqoawM',
    authDomain: 'hussam-erp-v3.firebaseapp.com',
    projectId: 'hussam-erp-v3',
    storageBucket: 'hussam-erp-v3.firebasestorage.app',
    messagingSenderId: '673166527899',
    appId: '1:673166527899:web:35dbc7d5850deab5b6e53e',
    measurementId: 'G-PYQRML0ERF'
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
            let app;
            if (window.firebase.apps && window.firebase.apps.length > 0) {
                app = window.firebase.apps[0];
            } else {
                app = window.firebase.initializeApp(firebaseConfig);
            }
            db = window.firebase.firestore(app);
        } catch (e) {
            console.error('Firebase init error (تأكد من ملء firebaseConfig):', e);
            return null;
        }
    }
    return db;
}

/** Write one storage key into Firestore (document = key name). */
export async function pushToFirestore(key, value, updatedAt = Date.now()) {
    const database = getFirestoreDB();
    if (!database) {
        console.warn('[Cloud Sync] Firestore DB not available for push');
        return false;
    }
    try {
        // Clean JSON data to eliminate undefined values which Firestore rejects
        const cleanData = JSON.parse(JSON.stringify(value));
        await database.collection(FIRESTORE_COLLECTION).doc(key).set({
            data: cleanData,
            updatedAt: updatedAt || Date.now()
        });
        console.log(`[Cloud Sync ✅] Successfully synced ${key} to cloud`);
        if (typeof window !== 'undefined' && window.updateCloudSyncBadge) {
            window.updateCloudSyncBadge(true);
        }
        return true;
    } catch (e) {
        console.error(`[Cloud Sync ❌ Error] Failed to write ${key} to Firestore:`, e);
        if (typeof window !== 'undefined' && window.updateCloudSyncBadge) {
            window.updateCloudSyncBadge(false, e.message || e.code);
        }
        return false;
    }
}

/** Read one storage key from Firestore (null when missing or offline). */
export async function pullFromFirestore(key) {
    const database = getFirestoreDB();
    if (!database) return null;
    try {
        const doc = await database.collection(FIRESTORE_COLLECTION).doc(key).get();
        if (!doc.exists) return null;
        const d = doc.data();
        return {
            data: d.data,
            updatedAt: Number(d.updatedAt || 0)
        };
    } catch (e) {
        console.error(`[Cloud Sync ❌ Error] Read failed for ${key}:`, e);
        if (typeof window !== 'undefined' && window.updateCloudSyncBadge) {
            window.updateCloudSyncBadge(false, e.message || e.code);
        }
        return null;
    }
}

export function subscribeToFirestore(onDocumentChange) {
    const database = getFirestoreDB();
    if (!database) return null;
    try {
        console.log('[Cloud Sync] Initializing live listener on collection:', FIRESTORE_COLLECTION);
        return database.collection(FIRESTORE_COLLECTION).onSnapshot(
            snapshot => {
                if (typeof window !== 'undefined' && window.updateCloudSyncBadge) {
                    window.updateCloudSyncBadge(true);
                }
                snapshot.docs.forEach(doc => {
                    const key = doc.id;
                    const docData = doc.data();
                    if (docData && docData.data !== undefined) {
                        onDocumentChange(key, docData.data, Number(docData.updatedAt || 0));
                    }
                });
            },
            err => {
                console.error('[Cloud Sync ❌ Listener Error]:', err);
                if (typeof window !== 'undefined' && window.updateCloudSyncBadge) {
                    window.updateCloudSyncBadge(false, err.message || err.code);
                }
            }
        );
    } catch (e) {
        console.warn('Failed to initialize Firestore real-time subscription:', e);
        if (typeof window !== 'undefined' && window.updateCloudSyncBadge) {
            window.updateCloudSyncBadge(false, e.message);
        }
        return null;
    }
}

export async function testFirebaseSync() {
    const database = getFirestoreDB();
    if (!database) {
        alert('❌ Firebase SDK غير متصل أو لم يتم تحميله بعد!');
        return false;
    }
    try {
        const testId = 'test_' + Date.now();
        await database.collection(FIRESTORE_COLLECTION).doc('_sync_health').set({
            testId,
            time: new Date().toISOString()
        });
        const readBack = await database.collection(FIRESTORE_COLLECTION).doc('_sync_health').get();
        if (readBack.exists && readBack.data().testId === testId) {
            alert('✅ الاتصال السحابي بـ Firebase يعمل 100%! الكتابة والقراءة السحابية المباشرة ناجحة ومفعلة.');
            return true;
        } else {
            alert('⚠️ تم الإرسال ولكن لم يتم تأكيد القراءة السحابية.');
            return false;
        }
    } catch (err) {
        console.error('Firebase test error:', err);
        alert(`❌ تنبيه من فايربيس (Firebase Error):\n• الكود: ${err.code || 'غير معروف'}\n• الرسالة: ${err.message}\n\n💡 الحل: يرجى الدخول إلى Firebase Console ➔ Firestore Database ➔ Rules والتأكد من تفعيل:\nallow read, write: if true;\nثم الضغط على Publish.`);
        return false;
    }
}
if (typeof window !== 'undefined') {
    window.testFirebaseSync = testFirebaseSync;
}


