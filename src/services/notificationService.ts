import * as Notifications from 'expo-notifications';
import { SatellitePass } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Requests user permission for local notifications.
   */
  public static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Error requesting notification permissions:', e);
      return false;
    }
  }

  /**
   * Schedules a reminder notification N minutes before a pass AOS.
   */
  public static async schedulePassAlert(
    pass: SatellitePass,
    minutesBefore: number = 10
  ): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return null;
    }

    const triggerMs = pass.aos.time - minutesBefore * 60 * 1000;
    const nowMs = Date.now();

    if (triggerMs <= nowMs) {
      // Pass is already starting or too close
      return null;
    }

    const secondsUntilTrigger = Math.round((triggerMs - nowMs) / 1000);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🛰️ Pase visible de ${pass.satelliteName || 'Satélite'}`,
        body: `El satélite iniciará su pase en ${minutesBefore} minutos (Elevación máx: ${pass.maxElevation.elevation}° a las ${new Date(
          pass.maxElevation.time
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`,
        data: { passId: pass.id },
      },
      trigger: {
        seconds: secondsUntilTrigger,
      } as any,
    });

    return notificationId;
  }

  public static async cancelAlert(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (e) {
      console.warn('Error cancelling notification:', e);
    }
  }
}
