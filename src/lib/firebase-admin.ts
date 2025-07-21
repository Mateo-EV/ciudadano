import { env } from "@/env";
import admin from "firebase-admin";

let app: admin.app.App;

// Inicializar Firebase Admin solo una vez
if (!admin.apps.length) {
  // Necesitarás configurar estas variables de entorno
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const projectId = env.FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    console.warn(
      "Firebase Admin credentials not found. Push notifications will be disabled.",
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
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
    }
  }
}

export const messaging = () => {
  if (!app) {
    throw new Error(
      "Firebase Admin is not initialized. Check your environment variables.",
    );
  }
  return admin.messaging(app);
};

export { admin };
