import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FileText, Clock, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useTimeStore } from '../../store/useTimeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { TimeBankService } from '../../domain/services/TimeBankService';
import { useRouter } from 'expo-router';

export function ReportsPanel() {
  const getRecordsByUserId = useTimeStore(state => state.getRecordsByUserId);
  const user = useAuthStore(state => state.user);
  const allUsers = useAuthStore(state => state.companyUsers);
  
  // Filtramos via useMemo para evitar loop infinito de re-render (nova ref de array)
  const companyUsers = React.useMemo(() => {
    return allUsers.filter(u => u.companyId === user?.companyId);
  }, [allUsers, user?.companyId]);
  
  const [reports, setReports] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Calcula os saldos baseados nos registros reais
    const rs = companyUsers.map(user => {
      const records = getRecordsByUserId(user.id);
      
      // Filtra registros apenas de HOJE para preview rápido no Dashboard
      const todayStr = new Date().toLocaleDateString('pt-BR');
      const todayRecords = records.filter(r => new Date(r.timestamp).toLocaleDateString('pt-BR') === todayStr);

      const hoursWorked = TimeBankService.calculateDailyHours(records);
      const balance = TimeBankService.calculateBalance(hoursWorked, 8); // Baseado em 8h/dia
      return {
        ...user,
        hoursWorked,
        balance,
        todayRecords
      };
    });
    setReports(rs);
  }, [getRecordsByUserId, companyUsers]);

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.container}>
      
      <View style={styles.header}>
        <FileText color={brandColors.primary} size={28} />
        <Text style={styles.title}>Relatório Unificado (Mês Corrente)</Text>
      </View>

      <ScrollView style={styles.listCard}>
        {reports.map((report, idx) => (
          <TouchableOpacity 
            key={report.id} 
            style={[styles.listItem, idx === reports.length - 1 && styles.noBorder]}
            activeOpacity={0.7}
            onPress={() => router.push(`/report/${report.id}`)}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.userName}>{report.name}</Text>
              <View style={styles.roleAndTodayRow}>
                <Text style={styles.userSubtitle}>{report.role === 'ADMIN' ? 'Admin' : 'Funcionário'}</Text>
                {report.todayRecords.length > 0 && (
                  <>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.todayText}>
                      Hoje: {report.todayRecords.map((r: any) => new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })).join(' \u2192 ')}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Clock color="#6b7280" size={16} />
                <Text style={styles.statText}>
                  T. Geral: {TimeBankService.formatDecimalToTime(report.hoursWorked)}h
                </Text>
              </View>
              
              <View style={[
                styles.balanceBox, 
                report.balance >= 0 ? styles.balancePositive : styles.balanceNegative
              ]}>
                <Text style={[
                  styles.balanceText,
                  report.balance >= 0 ? styles.textPositive : styles.textNegative
                ]}>
                  Saldo CLT: {TimeBankService.formatDecimalToTime(report.balance)}h
                </Text>
              </View>
              
              <ChevronRight color="#9ca3af" size={20} style={styles.arrow} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  listCard: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  roleAndTodayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  userSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  dotSeparator: {
    marginHorizontal: 8,
    color: '#d1d5db',
    fontSize: 14,
  },
  todayText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  balanceBox: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  balancePositive: {
    backgroundColor: '#ecfdf5',
  },
  balanceNegative: {
    backgroundColor: '#fef2f2',
  },
  balanceText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  textPositive: {
    color: '#10b981',
  },
  textNegative: {
    color: '#ef4444',
  },
  arrow: {
    marginLeft: 8,
  }
});
