# Sistema de Notificaciones Push - Ciudadano

Este documento explica cómo implementar y configurar el sistema de notificaciones push para la aplicación Ciudadano.

## Arquitectura

El sistema utiliza **Firebase Cloud Messaging (FCM)** para enviar notificaciones push a dispositivos móviles. Cuando se dispara una alerta:

1. Se crea la alerta en la base de datos
2. Se emite un evento por WebSocket (funcionalidad existente)
3. Se envían notificaciones push a usuarios cercanos (nueva funcionalidad)

## Configuración

### 1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita Firebase Cloud Messaging
4. Ve a Project Settings > Service Accounts
5. Haz clic en "Generate new private key"
6. Descarga el archivo JSON

### 2. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
FIREBASE_PROJECT_ID=tu-proyecto-firebase-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
```

**Importante**: El `FIREBASE_PRIVATE_KEY` debe incluir las comillas y los saltos de línea (`\n`).

### 3. Base de Datos

Ejecuta la migración de Prisma para crear la tabla de tokens:

```bash
npx prisma migrate dev --name add-push-tokens
```

## Endpoints API

### Registrar Token de Push

```http
POST /api/push-notifications/register-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fGxW8h2XdN0:APA91bH...",
  "platform": "android" // "ios", "android", "web"
}
```

### Desregistrar Token de Push

```http
POST /api/push-notifications/unregister-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fGxW8h2XdN0:APA91bH..."
}
```

## Flujo de Notificaciones

### Cuando se dispara una alerta:

1. **Evento WebSocket**: Se mantiene la funcionalidad existente
2. **Notificación Push**: Se envía automáticamente a usuarios con tokens registrados

```typescript
// Ejemplo de notificación push que se envía
{
  title: "🚨 Alerta de Emergencia",
  body: "Juan Pérez ha disparado una alerta en tu zona",
  data: {
    type: "emergency_alert",
    alertId: "alert_123",
    latitude: "-12.0464",
    longitude: "-77.0428",
    timestamp: "2025-07-20T15:30:00Z"
  }
}
```

## Implementación en el Cliente (Móvil)

### Android (React Native con Firebase)

```typescript
import messaging from "@react-native-firebase/messaging";

// Solicitar permisos
const requestPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await messaging().getToken();
    // Enviar token al backend
    await registerPushToken(token, "android");
  }
};

// Manejar notificaciones
messaging().onMessage(async (remoteMessage) => {
  if (remoteMessage.data?.type === "emergency_alert") {
    // Mostrar alerta en la app
    showEmergencyAlert(remoteMessage);
  }
});
```

### iOS (React Native con Firebase)

```typescript
import messaging from "@react-native-firebase/messaging";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";

// Solicitar permisos para iOS
const requestPermission = async () => {
  const result = await request(PERMISSIONS.IOS.NOTIFICATIONS);

  if (result === RESULTS.GRANTED) {
    const token = await messaging().getToken();
    await registerPushToken(token, "ios");
  }
};
```

## Gestión de Tokens

### Registro Automático

Cuando un usuario inicia sesión en la app móvil:

```typescript
const registerPushToken = async (token: string, platform: string) => {
  try {
    await fetch("/api/push-notifications/register-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, platform }),
    });
  } catch (error) {
    console.error("Error registering push token:", error);
  }
};
```

### Limpieza de Tokens

Cuando un usuario cierra sesión:

```typescript
const unregisterPushToken = async (token: string) => {
  try {
    await fetch("/api/push-notifications/unregister-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error("Error unregistering push token:", error);
  }
};
```

## Características del Sistema

### ✅ Funcionalidades Implementadas

- **Registro de Tokens**: Los usuarios pueden registrar sus tokens FCM
- **Notificaciones de Alerta**: Se envían automáticamente cuando se dispara una alerta
- **Gestión de Tokens Inválidos**: Los tokens que fallan se desactivan automáticamente
- **Múltiples Dispositivos**: Un usuario puede tener tokens en múltiples dispositivos
- **Exclusión del Emisor**: El usuario que dispara la alerta no recibe su propia notificación

### 🔄 Mejoras Futuras

- **Geolocalización**: Enviar notificaciones solo a usuarios en un radio específico
- **Categorías de Alerta**: Diferentes tipos de notificaciones según el tipo de emergencia
- **Notificaciones Programadas**: Para recordatorios o alertas preventivas
- **Analytics**: Métricas de entrega y engagement de notificaciones

## Seguridad

- Los tokens de push se almacenan de forma segura en la base de datos
- Solo usuarios autenticados pueden registrar/desregistrar tokens
- Los tokens se validan antes de enviar notificaciones
- Los tokens inválidos se eliminan automáticamente

## Monitoreo

El sistema registra logs para:

- Registro/desregistro de tokens
- Envío exitoso/fallido de notificaciones
- Tokens inválidos detectados
- Errores de configuración de Firebase

## Troubleshooting

### Error: "Firebase Admin is not initialized"

- Verifica que las variables de entorno estén configuradas correctamente
- Asegúrate de que el `FIREBASE_PRIVATE_KEY` incluya las comillas y saltos de línea

### Las notificaciones no llegan

- Verifica que el token esté registrado en la base de datos
- Confirma que Firebase esté configurado correctamente
- Revisa los logs del servidor para errores de envío

### Tokens inválidos

- Los tokens pueden expirar o invalidarse cuando se desinstala la app
- El sistema los detecta automáticamente y los desactiva
