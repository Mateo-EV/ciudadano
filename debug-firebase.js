// Script temporal para debuggear las variables de entorno de Firebase
// Ejecuta este script con: node debug-firebase.js

console.log("=== DEBUG FIREBASE ENVIRONMENT VARIABLES ===\n");

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log("Environment variables status:");
console.log(
  "- FIREBASE_PROJECT_ID:",
  firebaseProjectId ? "✅ SET" : "❌ MISSING",
);
console.log(
  "- FIREBASE_CLIENT_EMAIL:",
  firebaseClientEmail ? "✅ SET" : "❌ MISSING",
);
console.log(
  "- FIREBASE_PRIVATE_KEY:",
  firebasePrivateKey ? "✅ SET" : "❌ MISSING",
);

if (firebaseProjectId) {
  console.log("\nFIREBASE_PROJECT_ID value:", firebaseProjectId);
}

if (firebaseClientEmail) {
  console.log("\nFIREBASE_CLIENT_EMAIL value:", firebaseClientEmail);
}

if (firebasePrivateKey) {
  console.log("\nFIREBASE_PRIVATE_KEY:");
  console.log("- Length:", firebasePrivateKey.length);
  console.log("- Starts with:", firebasePrivateKey.substring(0, 50) + "...");
  console.log(
    "- Contains \\n sequences:",
    firebasePrivateKey.includes("\\n") ? "YES" : "NO",
  );
  console.log(
    "- Contains actual newlines:",
    firebasePrivateKey.includes("\n") ? "YES" : "NO",
  );
}

console.log("\n=== END DEBUG ===");
