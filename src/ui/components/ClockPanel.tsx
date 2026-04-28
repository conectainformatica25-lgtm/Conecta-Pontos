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

      {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
      {isLoading ? (
        <Text style={{ color: '#6b7280' }}>Carregando seus registros no Banco de Dados...</Text>
      ) : (
        <>
          {/* Linha 1: Entrada + Início do Almoço */}
          <View style={styles.row}>
            <View style={styles.cell}>
              {renderButton('ENTRADA', 'Entrada', LogIn, !hasEntrada, hasEntrada)}
            </View>
            <View style={styles.cell}>
              {renderButton('SAIDA_ALMOCO', 'Início do\nAlmoço', Coffee, hasEntrada && !hasSaidaAlmoco, hasSaidaAlmoco)}
            </View>
          </View>
          {/* Linha 2: Retorno do Almoço + Saída */}
          <View style={styles.row}>
            <View style={styles.cell}>
              {renderButton('RETORNO_ALMOCO', 'Retorno do\nAlmoço', ArrowLeftRight, hasSaidaAlmoco && !hasRetornoAlmoco, hasRetornoAlmoco)}
            </View>
            <View style={styles.cell}>
              {renderButton('SAIDA', 'Saída', LogOut, (hasEntrada && !hasSaidaAlmoco) || hasRetornoAlmoco, hasSaida)}
            </View>
          </View>
        </>
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
  // Layout 2x2 com linhas explícitas — funciona em qualquer tela
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cell: {
    flex: 1,
    marginHorizontal: 6,
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
