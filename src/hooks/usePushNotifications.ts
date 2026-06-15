import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { apiClient } from '../services/api/apiClient';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Hook para gerenciar Web Push Notifications no admin.
 * Pede permissão, registra subscription no backend.
 * Funciona apenas na web (PWA).
 */
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    setPermission(Notification.permission);

    // Se já tem permissão, verifica se já está registrado
    if (Notification.permission === 'granted') {
      checkIfRegistered();
    }
  }, []);

  /**
   * Solicita permissão e registra a subscription push no backend.
   * Chamado pelo botão "Ativar Notificações" no header do admin.
   */
  const requestAndRegister = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) return false;
    setIsLoading(true);

    try {
      // 1. Pede permissão ao usuário
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return false;

      // 2. Busca a chave pública VAPID do backend
      const vapidRes = await apiClient.get<{ publicKey: string }>('/push/vapid-public-key');
      const vapidPublicKey = vapidRes.data.publicKey;

      // 3. Registra o service worker (garantia)
      const reg = await navigator.serviceWorker.ready;

      // 4. Cria ou recupera a subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // 5. Envia subscription ao backend
      const subJson = sub.toJSON();
      await apiClient.post('/push/subscribe', {
        userId: user.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      });

      setIsRegistered(true);
      return true;
    } catch (err) {
      console.error('Erro ao registrar push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id]);

  const checkIfRegistered = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsRegistered(!!sub);
      
      // Se a permissão já foi concedida mas não há inscrição ativa localmente,
      // realiza a inscrição automaticamente em segundo plano.
      if (!sub && Notification.permission === 'granted') {
        await requestAndRegister();
      }
    } catch {
      setIsRegistered(false);
    }
  }, [requestAndRegister]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    setPermission(Notification.permission);

    // Se já tem permissão, verifica se já está registrado
    if (Notification.permission === 'granted') {
      checkIfRegistered();
    }
  }, [checkIfRegistered]);

  return {
    isSupported,
    permission,
    isRegistered,
    isLoading,
    requestAndRegister,
  };
}

/** Converte a chave VAPID base64url para Uint8Array (exigido pela PushManager API) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
