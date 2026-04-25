import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, History, Calendar } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../../src/ui/themes/colors.theme';
import { useTimeStore } from '../../src/store/useTimeStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { TimeBankService } from '../../src/domain/services/TimeBankService';
import { TimeRecord } from '../../src/domain/entities/TimeRecord';

export default function UserReportDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const companyUsers = useAuthStore(state => state.companyUsers);
  const getRecordsByUserId = useTimeStore(state => state.getRecordsByUserId);

  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<Record<string, TimeRecord[]>>({});
  const [balance, setBalance] = useState({ worked: 0, realBalance: 0 });

  useEffect(() => {
    if (id) {
      const foundUser = companyUsers.find(u => u.id === id);
      setUser(foundUser);

      const userRecords = getRecordsByUserId(id as string);
      
      const groupedRecords = TimeBankService.groupRecordsByDay(userRecords);
      setRecords(groupedRecords);

      const hoursWorked = TimeBankService.calculateDailyHours(userRecords);
      const realBalance = TimeBankService.calculateBalance(hoursWorked, 8); // CLT base
      
      setBalance({ worked: hoursWorked, realBalance });
    }
  }, [id, companyUsers, getRecordsByUserId]);

  const mapRecordTypeToLabel = (type: string) => {
    switch (type) {
      case 'ENTRADA': return 'Entrada';
      case 'SAIDA_ALMOCO': return 'Início do Almoço';
      case 'RETORNO_ALMOCO': return 'Retorno do Almoço';
      case 'SAIDA': return 'Saída Final';
      default: return type;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={brandColors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Relatório</Text>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* User Card */}
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.userCard}>
          <Text style={styles.userName}>{user?.name || 'Carregando...'}</Text>
          <Text style={styles.userRole}>{user?.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Clock color="#6b7280" size={16} />
              <Text style={styles.statText}>Trabalhou: {TimeBankService.formatDecimalToTime(balance.worked)}h</Text>
            </View>
            <View style={[styles.statPill, balance.realBalance >= 0 ? styles.pillPositive : styles.pillNegative]}>
              <Text style={[styles.statText, balance.realBalance >= 0 ? styles.textPositive : styles.textNegative]}>
                Saldo: {TimeBankService.formatDecimalToTime(balance.realBalance)}h
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* History Timeline */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <History color={brandColors.primary} size={24} />
            <Text style={styles.sectionTitle}>Histórico de Batimentos</Text>
          </View>

          <View style={styles.timelineGroup}>
            {Object.keys(records).length === 0 ? (
              <View style={styles.timelineCard}>
                <Text style={styles.emptyText}>Nenhum ponto registrado.</Text>
              </View>
            ) : (
              Object.entries(records).map(([dateStr, dailyRecords]) => (
                <View key={dateStr} style={styles.timelineCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{dateStr}</Text>
                    <View style={styles.dailyHoursPill}>
                      <Text style={styles.dailyHoursText}>
                        Total do dia: {TimeBankService.formatDecimalToTime(TimeBankService.calculateDailyHours(dailyRecords))}h
                      </Text>
                    </View>
                  </View>

                  {dailyRecords.map((record, index) => (
                    <View key={record.id} style={styles.timelineItem}>
                      <View style={styles.timelineConnector}>
                        <View style={styles.timelineDot} />
                        {index !== dailyRecords.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      
                      <View style={styles.timelineContent}>
                        <Text style={styles.recordType}>{mapRecordTypeToLabel(record.type)}</Text>
                        
                        <View style={styles.recordDetails}>
                          <View style={styles.detailRow}>
                            <Clock size={14} color="#9ca3af" />
                            <Text style={styles.detailText}>
                              {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: brandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16, // SafeArea fake para Android
  },
  backBtn: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    color: brandColors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: brandColors.white,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pillPositive: {
    backgroundColor: '#ecfdf5',
  },
  pillNegative: {
    backgroundColor: '#fef2f2',
  },
  statText: {
    fontWeight: '600',
    color: '#374151',
  },
  textPositive: {
    color: '#10b981',
  },
  textNegative: {
    color: '#ef4444',
  },
  historySection: {
    width: '100%',
    maxWidth: 600,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  timelineGroup: {
    gap: 16,
  },
  timelineCard: {
    backgroundColor: brandColors.white,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  dailyHoursPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dailyHoursText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineConnector: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: brandColors.primary,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  recordDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
