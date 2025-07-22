import { messaging, isFirebaseInitialized } from "@/lib/firebase-admin";
import { db } from "@/server/db";

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface AlertPushNotificationData extends PushNotificationData {
  latitude: number;
  longitude: number;
  alertId: string;
}

export class PushNotificationService {
  /**
   * Envía una notificación push a un usuario específico
   */
  static async sendToUser(
    userId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Obtener todos los tokens activos del usuario
      const pushTokens = await db.pushToken.findMany({
        where: {
          user_id: userId,
          is_active: true,
        },
      });

      if (pushTokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return;
      }

      const tokens = pushTokens.map((token) => token.token);
      await this.sendToTokens(tokens, notification);
    } catch (error) {
      console.error("Error sending push notification to user:", error);
    }
  }

  /**
   * Envía una notificación push a múltiples usuarios
   */
  static async sendToUsers(
    userIds: string[],
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Obtener todos los tokens activos de los usuarios
      const pushTokens = await db.pushToken.findMany({
        where: {
          user_id: { in: userIds },
          is_active: true,
        },
      });

      if (pushTokens.length === 0) {
        console.log(`No push tokens found for users: ${userIds.join(", ")}`);
        return;
      }

      const tokens = pushTokens.map((token) => token.token);
      await this.sendToTokens(tokens, notification);
    } catch (error) {
      console.error("Error sending push notification to users:", error);
    }
  }

  /**
   * Envía una notificación push a todos los usuarios (broadcast)
   */
  static async sendToAllUsers(
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Obtener todos los tokens activos
      const pushTokens = await db.pushToken.findMany({
        where: {
          is_active: true,
        },
      });

      if (pushTokens.length === 0) {
        console.log("No active push tokens found");
        return;
      }

      const tokens = pushTokens.map((token) => token.token);
      await this.sendToTokens(tokens, notification);
    } catch (error) {
      console.error("Error sending broadcast push notification:", error);
    }
  }

  /**
   * Envía una notificación específica para alertas a usuarios cercanos
   */
  static async sendAlertToNearbyUsers(
    alertData: AlertPushNotificationData,
    excludeUserId?: string,
  ): Promise<void> {
    try {
      // Aquí podrías implementar lógica para encontrar usuarios cercanos
      // Por ahora enviaremos a todos los usuarios excepto al que disparó la alerta
      const pushTokens = await db.pushToken.findMany({
        where: {
          is_active: true,
          ...(excludeUserId && {
            user_id: { not: excludeUserId },
          }),
        },
      });

      if (pushTokens.length === 0) {
        console.log("No nearby users found for alert notification");
        return;
      }

      const tokens = pushTokens.map((token) => token.token);

      const alertNotification: PushNotificationData = {
        title: alertData.title,
        body: alertData.body,
        data: {
          type: "alert",
          alertId: alertData.alertId,
          latitude: alertData.latitude.toString(),
          longitude: alertData.longitude.toString(),
          ...alertData.data,
        },
        imageUrl: alertData.imageUrl,
      };

      await this.sendToTokens(tokens, alertNotification);
    } catch (error) {
      console.error("Error sending alert notification to nearby users:", error);
    }
  }

  /**
   * Función privada para enviar notificaciones a tokens específicos
   */
  private static async sendToTokens(
    tokens: string[],
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Verificar si Firebase está inicializado
      if (!isFirebaseInitialized()) {
        console.warn(
          "Firebase Admin is not initialized. Skipping push notifications.",
        );
        return;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
        },
        data: notification.data ?? {},
        tokens,
      };

      const response = await messaging().sendEachForMulticast(message);

      console.log(`Successfully sent ${response.successCount} notifications`);

      if (response.failureCount > 0) {
        console.log(`Failed to send ${response.failureCount} notifications`);

        // Manejar tokens inválidos
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]!);
            console.error(
              `Error for token ${tokens[idx]}: ${resp.error?.message}`,
            );
          }
        });

        // Desactivar tokens inválidos
        if (failedTokens.length > 0) {
          await this.deactivateInvalidTokens(failedTokens);
        }
      }
    } catch (error) {
      console.error("Error sending push notifications:", error);
    }
  }

  /**
   * Desactiva tokens que ya no son válidos
   */
  private static async deactivateInvalidTokens(
    tokens: string[],
  ): Promise<void> {
    try {
      await db.pushToken.updateMany({
        where: {
          token: { in: tokens },
        },
        data: {
          is_active: false,
        },
      });
      console.log(`Deactivated ${tokens.length} invalid tokens`);
    } catch (error) {
      console.error("Error deactivating invalid tokens:", error);
    }
  }

  /**
   * Registra un nuevo token de push para un usuario
   */
  static async registerToken(
    userId: string,
    token: string,
    platform: string,
  ): Promise<void> {
    try {
      await db.pushToken.upsert({
        where: { token },
        update: {
          user_id: userId,
          platform,
          is_active: true,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          token,
          platform,
          is_active: true,
        },
      });
      console.log(`Push token registered for user ${userId}`);
    } catch (error) {
      console.error("Error registering push token:", error);
    }
  }

  /**
   * Desactiva un token de push
   */
  static async unregisterToken(token: string): Promise<void> {
    try {
      await db.pushToken.updateMany({
        where: { token },
        data: { is_active: false },
      });
      console.log(`Push token unregistered: ${token}`);
    } catch (error) {
      console.error("Error unregistering push token:", error);
    }
  }
}
