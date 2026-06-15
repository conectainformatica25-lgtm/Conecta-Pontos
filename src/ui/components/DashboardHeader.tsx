import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Download, Clock, LogOut, Bell, BellOff } from 'lucide-react-native';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'expo-router';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export function DashboardHeader() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();
  const { isInstallable, promptInstall } = usePWAInstall();
  const { isSupported, permission, isRegistered, isLoading, requestAndRegister } = usePushNotifications();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleEnableNotifications = async () => {
    if (Platform.OS !== 'web') return;
    const success = await requestAndRegister();
    if (success) {
      // Feedback visual — notificação de teste local
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Notificações ativadas!', {
          body: 'Você receberá alertas quando funcionários baterem ponto.',
          icon: '/assets/images/icon.png',
        });
      }
    }
  };

  // Mostra o botão de notificações apenas para admin na web
  const showNotificationBtn = Platform.OS === 'web'
    && user?.role === 'ADMIN'
    && isSupported
    && permission !== 'denied';

  const notificationIcon = isRegistered
    ? <Bell color="#22c55e" size={16} />
    : <Bell color={brandColors.white} size={16} />;

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Clock color={brandColors.white} size={28} />
        <Text style={styles.logoText}>Conecta Pontos</Text>
      </View>

      <View style={styles.profileContainer}>
        {/* Botão Instalar PWA */}
        {isInstallable && (
          <TouchableOpacity style={styles.installBtn} onPress={promptInstall}>
            <Download color={brandColors.white} size={16} />
            <Text style={styles.installText}>Instalar App</Text>
          </TouchableOpacity>
        )}

        {/* Botão Ativar Notificações (apenas admin) */}
        {showNotificationBtn && !isRegistered && (
          <TouchableOpacity
            style={[styles.notificationBtn, isLoading && styles.btnDisabled]}
            onPress={handleEnableNotifications}
            disabled={isLoading}
          >
            <Bell color={brandColors.white} size={16} />
            <Text style={styles.notificationText}>
              {isLoading ? 'Ativando...' : '🔔 Ativar Alertas'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Indicador: notificações ativas */}
        {showNotificationBtn && isRegistered && (
          <View style={styles.notificationActive}>
            <Bell color="#22c55e" size={16} />
            <Text style={styles.notificationActiveText}>Alertas ativos</Text>
          </View>
        )}

        <Text style={styles.userName}>{user?.name || 'Visitante'}</Text>

        {user?.role === 'ADMIN' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color={brandColors.white} size={20} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: brandColors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexWrap: 'wrap',
    gap: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    color: brandColors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  installText: {
    color: brandColors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  notificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234,179,8,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  notificationText: {
    color: brandColors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  notificationActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  notificationActiveText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  userName: {
    color: brandColors.white,
    fontSize: 16,
  },
  badge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: brandColors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    paddingLeft: 12,
    marginLeft: 4,
  },
  logoutText: {
    color: brandColors.white,
    fontSize: 14,
  },
});
