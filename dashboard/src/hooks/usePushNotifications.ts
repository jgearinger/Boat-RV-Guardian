import { useState, useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const registerPush = async () => {
      // Push notifications only work on Android and iOS physical devices
      if (Capacitor.getPlatform() === 'web') return;

      try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.warn('User denied push notification permissions');
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          if (!isMounted) return;
          console.log('Push registration success, token: ' + token.value);
          setFcmToken(token.value);
          
          // Send token to our Cloudflare Worker
          try {
            // REPLACE THIS URL with the deployed Cloudflare worker URL
            const WORKER_URL = 'https://boat-rv-guardian-notifications.YOUR_USERNAME.workers.dev/register';
            await fetch(WORKER_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token.value }),
            });
          } catch (e) {
            console.error('Failed to send FCM token to Cloudflare:', e);
          }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ' + JSON.stringify(notification));
          // Local alarms or modals can be triggered here if app is open
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ' + JSON.stringify(notification));
        });
      } catch (e) {
        console.error('Push notification setup failed:', e);
      }
    };

    registerPush();

    return () => {
      isMounted = false;
      if (Capacitor.getPlatform() !== 'web') {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  return { fcmToken };
}
