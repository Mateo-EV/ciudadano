import { env } from "@/env";
import admin from "firebase-admin";

let app: admin.app.App | null = null;

// Inicializar Firebase Admin solo una vez
if (!admin.apps.length) {
  // Necesitarás configurar estas variables de entorno
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const projectId = env.FIREBASE_PROJECT_ID;

  console.log("Firebase Admin initialization attempt:", {
    hasPrivateKey: !!privateKey,
    hasClientEmail: !!clientEmail,
    hasProjectId: !!projectId,
    privateKeyLength: privateKey?.length ?? 0,
  });

  if (!privateKey || !clientEmail || !projectId) {
    console.warn(
      "Firebase Admin credentials not found. Push notifications will be disabled.",
      {
        privateKey: privateKey ? "SET" : "MISSING",
        clientEmail: clientEmail ? "SET" : "MISSING",
        projectId: projectId ? "SET" : "MISSING",
      },
    );
  } else {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          privateKey,
          clientEmail,
          projectId,
        }),
        projectId,
      });
      console.log("Firebase Admin initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
      app = null;
    }
  }
} else {
  // Si ya hay apps inicializadas, usar la primera
  app = admin.apps[0]!;
  console.log("Using existing Firebase Admin app");
}

export const messaging = () => {
  if (!app) {
    throw new Error(
      "Firebase Admin is not initialized. Check your environment variables.",
    );
  }
  return admin.messaging(app);
};

export const isFirebaseInitialized = () => {
  return !!app;
};

export { admin };
