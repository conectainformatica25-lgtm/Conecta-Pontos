import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FileText, Clock, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/api/apiClient';
import { TimeBankService } from '../../domain/services/TimeBankService';
import { useRouter } from 'expo-router';

interface EmployeeReport {
  id: string;
  name: string;
  email: string;
  role: string;
  hoursWorked: number;
  balance: number;
  todayRecords: any[];
}

export function ReportsPanel() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.companyId) return;
    const load = async () => {
      setLoading(true);
      try {
        // Busca todos os funcionários e todos os registros da empresa em paralelo
        const [usersRes, recordsRes] = await Promise.all([
          apiClient.get(`/users/${user.companyId}`),
          apiClient.get(`/records/company/${user.companyId}`),
        ]);

        const employees: any[] = usersRes.data;
        const allRecords: any[] = recordsRes.data;

        const todayStr = new Date().toLocaleDateString('pt-BR');

        const rs: EmployeeReport[] = employees.map(emp => {
          const empRecords = allRecords.filter(r => r.userId === emp.id);
          const todayRecords = empRecords.filter(r =>
            new Date(r.timestamp).toLocaleDateString('pt-BR') === todayStr
          );
          const hoursWorked = TimeBankService.calculateDailyHours(empRecords);
          const balance = TimeBankService.calculateBalance(hoursWorked, 8);
          return { ...emp, hoursWorked, balance, todayRecords };
        });

        setReports(rs);
      } catch (e) {
        console.error('Erro ao carregar relatórios', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.companyId]);

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.container}>

      <View style={styles.header}>
        <FileText color={brandColors.primary} size={28} />
        <Text style={styles.title}>Relatório Unificado (Mês Corrente)</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={brandColors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.listCard}>
          {reports.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum funcionário ou registro encontrado.</Text>
          ) : (
            reports.map((report, idx) => (
              <TouchableOpacity
                key={report.id}
                style={[styles.listItem, idx === reports.length - 1 && styles.noBorder]}
                activeOpacity={0.7}
                onPress={() => router.push(`/report/${report.id}`)}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.userName} numberOfLines={1}>{report.name}</Text>
                  <View style={styles.roleAndTodayRow}>
                    <Text style={styles.userSubtitle}>{report.role === 'ADMIN' ? 'Admin' : 'Funcionário'}</Text>
                    {report.todayRecords.length > 0 && (
                      <>
                        <Text style={styles.dotSeparator}>•</Text>
                        <Text style={styles.todayText}>
                          Hoje: {report.todayRecords.map((r: any) => new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })).join(' → ')}
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
            ))
          )}
        </ScrollView>
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
  emptyText: {
    padding: 24,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
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
    gap: 8,
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
