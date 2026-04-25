import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Clock, LogIn, Coffee, ArrowLeftRight, LogOut } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useTimeStore } from '../../store/useTimeStore';
import { RecordType } from '../../domain/entities/TimeRecord';

export function ClockPanel() {
  const user = useAuthStore(state => state.user);
  const addRecord = useTimeStore(state => state.addRecord);
  const getTodayRecordsByUserId = useTimeStore(state => state.getTodayRecordsByUserId);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
          isActive && !isDone && styles.actionBtnActive,
          isDone && styles.actionBtnDone
        ]}
        disabled={disabled}
        onPress={() => handlePonto(type)}
        activeOpacity={0.7}
      >
        <Icon color={disabled ? '#9ca3af' : '#10b981'} size={32} />
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

      <View style={styles.actionGrid}>
        {renderButton('ENTRADA', 'Entrada', LogIn, !hasEntrada, hasEntrada)}
        {renderButton('SAIDA_ALMOCO', 'Início do Almoço', Coffee, hasEntrada && !hasSaidaAlmoco, hasSaidaAlmoco)}
        {renderButton('RETORNO_ALMOCO', 'Retorno do Almoço', ArrowLeftRight, hasSaidaAlmoco && !hasRetornoAlmoco, hasRetornoAlmoco)}
        {renderButton('SAIDA', 'Saída', LogOut, (hasEntrada && !hasSaidaAlmoco) || hasRetornoAlmoco, hasSaida)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  salutation: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  instruction: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  clockCard: {
    backgroundColor: brandColors.white,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  clockText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: brandColors.primary,
  },
  dateText: {
    fontSize: 16,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginTop: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionBtn: {
    backgroundColor: '#f9fafb',
    width: '48%',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    fontSize: 18,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 12,
  },
  textDisabled: {
    color: '#9ca3af',
  },
  actionSubtext: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 4,
  },
});
