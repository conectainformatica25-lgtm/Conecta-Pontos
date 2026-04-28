import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { LogIn, Coffee, ArrowLeftRight, LogOut } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimeStore } from '../../store/useTimeStore';
import { RecordType } from '../../domain/entities/TimeRecord';

export function ClockPanel() {
  const { width: screenWidth } = useWindowDimensions();
  const user = useAuthStore(state => state.user);
  const addRecord = useTimeStore(state => state.addRecord);
  const getTodayRecordsByUserId = useTimeStore(state => state.getTodayRecordsByUserId);
  const fetchRecordsByUserId = useTimeStore(state => state.fetchRecordsByUserId);
  const isLoading = useTimeStore(state => state.isLoading);
  const error = useTimeStore(state => state.error);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (user?.id) {
      fetchRecordsByUserId(user.id);
    }
    return () => clearInterval(timer);
  }, [user?.id, fetchRecordsByUserId]);

  const todayRecords = getTodayRecordsByUserId(user?.id || '');
  const hasEntrada = todayRecords.some(r => r.type === 'ENTRADA');
  const hasSaidaAlmoco = todayRecords.some(r => r.type === 'SAIDA_ALMOCO');
  const hasRetornoAlmoco = todayRecords.some(r => r.type === 'RETORNO_ALMOCO');
  const hasSaida = todayRecords.some(r => r.type === 'SAIDA');

  const handlePonto = (tipo: RecordType) => {
    if (!user) return;
    addRecord(user.id, user.companyId, tipo);
    Alert.alert('Sucesso', 'Ponto registrado com sucesso!');
  };

  // Calcula largura de cada botão em pixels absolutos
  // containerPadding = 16 de cada lado = 32 total
  // gapBetweenButtons = 12
  // btnWidth = (screenWidth - 32 - 12) / 2
  const containerPadding = 32;
  const gap = 12;
  const maxContainerWidth = Math.min(screenWidth, 800);
  const btnWidth = (maxContainerWidth - containerPadding - gap) / 2;

  const renderButton = (
    type: RecordType,
    label: string,
    Icon: any,
    isActive: boolean,
    isDone: boolean
  ) => {
    const disabled = !isActive || isDone;

    return (
      <TouchableOpacity
        style={[
          styles.actionBtn,
          { width: btnWidth },
          isActive && !isDone && styles.actionBtnActive,
          isDone && styles.actionBtnDone,
        ]}
        disabled={disabled}
        onPress={() => handlePonto(type)}
        activeOpacity={0.7}
      >
        <Icon color={disabled ? '#9ca3af' : '#10b981'} size={28} />
        <Text style={[styles.actionText, disabled && styles.textDisabled]}>
          {label}
        </Text>
        {disabled && (
          <Text style={styles.actionSubtext}>{isDone ? 'Concluído' : 'Indisponível'}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.container}>
      <Text style={styles.salutation}>Olá, {user?.name}!</Text>
      <Text style={styles.instruction}>Registre seu ponto abaixo</Text>

      <View style={styles.clockCard}>
        <Text style={styles.clockText}>
          {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
        <Text style={styles.dateText}>
          {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
      {isLoading ? (
        <Text style={{ color: '#6b7280' }}>Carregando...</Text>
      ) : (
        <View style={styles.grid}>
          {/* Linha 1 */}
          <View style={styles.gridRow}>
            {renderButton('ENTRADA', 'Entrada', LogIn, !hasEntrada, hasEntrada)}
            {renderButton('SAIDA_ALMOCO', 'Início do Almoço', Coffee, hasEntrada && !hasSaidaAlmoco, hasSaidaAlmoco)}
          </View>
          {/* Linha 2 */}
          <View style={styles.gridRow}>
            {renderButton('RETORNO_ALMOCO', 'Retorno do Almoço', ArrowLeftRight, hasSaidaAlmoco && !hasRetornoAlmoco, hasRetornoAlmoco)}
            {renderButton('SAIDA', 'Saída', LogOut, (hasEntrada && !hasSaidaAlmoco) || hasRetornoAlmoco, hasSaida)}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  salutation: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  instruction: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 20,
  },
  clockCard: {
    backgroundColor: brandColors.white,
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  clockText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: brandColors.primary,
  },
  dateText: {
    fontSize: 15,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginTop: 8,
    textAlign: 'center',
  },
  // Grid com linhas explícitas
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 110,
  },
  actionBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  actionBtnDone: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  actionText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  textDisabled: {
    color: '#9ca3af',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 4,
    textAlign: 'center',
  },
});
