import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { Fingerprint, X, ShieldCheck } from 'lucide-react-native';
import { brandColors } from '../themes/colors.theme';
import { enrollBiometric } from '../../services/api/webauthn';

interface Props {
  visible: boolean;
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function FingerprintModal({ visible, employeeId, employeeName, onSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const startEnrollment = async () => {
    setLoading(true);
    try {
      await enrollBiometric(employeeId);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 1500);
    } catch (error: any) {
      Alert.alert('Erro na Leitura', error.message || 'Dispositivo não suporta biometria ou você cancelou.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Fingerprint size={24} color={brandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Impressão Digital</Text>
              <Text style={styles.headerSub}>{employeeName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {!success ? (
            <>
              <Text style={styles.instruction}>
                Para cadastrar a impressão digital, clique no botão abaixo e encoste o dedo no sensor do seu dispositivo quando solicitado.
              </Text>

              <View style={styles.iconArea}>
                {loading ? (
                  <ActivityIndicator size="large" color={brandColors.primary} />
                ) : (
                  <Fingerprint size={80} color={brandColors.primary + '40'} />
                )}
              </View>

              <TouchableOpacity 
                style={[styles.btn, loading && styles.btnDisabled]} 
                onPress={startEnrollment}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? 'Aguardando Sensor...' : 'Iniciar Leitura Biométrica'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successArea}>
              <ShieldCheck size={64} color="#10b981" />
              <Text style={styles.successTitle}>Biometria Cadastrada!</Text>
              <Text style={styles.successSub}>
                {employeeName} agora pode fazer login usando apenas a impressão digital.
              </Text>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 24, width: '90%', maxWidth: 400,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: brandColors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4 },
  instruction: {
    fontSize: 15, color: '#4b5563', textAlign: 'center',
    marginBottom: 24, lineHeight: 22,
  },
  iconArea: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, marginBottom: 24,
    backgroundColor: '#f9fafb', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed'
  },
  btn: {
    backgroundColor: brandColors.primary, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  successArea: { alignItems: 'center', paddingVertical: 32 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#10b981', marginTop: 16, marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
