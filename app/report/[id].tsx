import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, Platform, ActivityIndicator, TextInput, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, History } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../../src/ui/themes/colors.theme';
import { TimeBankService } from '../../src/domain/services/TimeBankService';
import { TimeRecord } from '../../src/domain/entities/TimeRecord';
import { apiClient } from '../../src/services/api/apiClient';

export default function UserReportDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<Record<string, TimeRecord[]>>({});
  const [loading, setLoading] = useState(true);

  // Obter datas padrão do mês corrente
  const getInitialDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    
    // Primeiro dia do mês corrente: YYYY-MM-01
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    
    // Último dia do mês corrente: YYYY-MM-lastDay
    const lastDayVal = new Date(year, month + 1, 0).getDate();
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayVal).padStart(2, '0')}`;
    
    return { firstDay, lastDay };
  };

  const { firstDay, lastDay } = getInitialDates();
  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(lastDay);

  const todayStr = new Date().toLocaleDateString('pt-BR');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/records/${id}`);
        const userRecords: TimeRecord[] = res.data;

        // Tenta encontrar o usuário pelo header de records (que já inclui user)
        // Ou busca pelo companyId do primeiro registro
        if (userRecords.length > 0) {
          const firstRecord = userRecords[0] as any;
          if (firstRecord.user) {
            setUser(firstRecord.user);
          }
        }

        // Busca direto pelo ID no contexto do relatório
        const companyRes = await apiClient.get(`/users/${(userRecords[0] as any)?.companyId || ''}`);
        const employees = companyRes.data;
        const foundUser = employees.find((u: any) => u.id === id);
        setUser(foundUser || null);

        const grouped = TimeBankService.groupRecordsByDay(userRecords);
        setRecords(grouped);
      } catch (e) {
        console.error('Erro ao carregar relatório', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const mapRecordTypeToLabel = (type: string) => {
    switch (type) {
      case 'ENTRADA': return 'Entrada';
      case 'SAIDA_ALMOCO': return 'Início do Almoço';
      case 'RETORNO_ALMOCO': return 'Retorno do Almoço';
      case 'SAIDA': return 'Saída Final';
      default: return type;
    }
  };

  const filteredEntries = Object.entries(records).filter(([dateStr]) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    const itemDate = new Date(year, month - 1, day);
    itemDate.setHours(0, 0, 0, 0);

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      if (itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate + 'T00:00:00');
      if (itemDate > end) return false;
    }
    return true;
  });

  const getDynamicStats = () => {
    let worked = 0;
    let daysWithRecords = 0;

    for (const [_, dailyRecords] of filteredEntries) {
      const dailyWorked = TimeBankService.calculateDailyHours(dailyRecords);
      if (dailyWorked > 0 || dailyRecords.length > 0) {
        worked += dailyWorked;
        daysWithRecords += 1;
      }
    }

    const expectedHours = daysWithRecords * 8;
    const realBalance = worked - expectedHours;

    return { worked, realBalance };
  };

  const dynamicStats = getDynamicStats();

  const exportToCSV = (rangeOnly: boolean) => {
    let baseUrl = apiClient.defaults.baseURL || '/api';
    
    if (Platform.OS === 'web') {
      const currentHost = window.location.host;
      if (currentHost.includes('8082')) {
        baseUrl = 'http://localhost:3000/api';
      } else if (baseUrl.startsWith('/')) {
        baseUrl = `${window.location.origin}${baseUrl}`;
      }
      
      const exportUrl = `${baseUrl}/records/export/${id}?startDate=${startDate}&endDate=${endDate}&rangeOnly=${rangeOnly}`;
      window.location.href = exportUrl;
    } else {
      alert('A exportação está disponível na versão Web do sistema.');
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

      {loading ? (
        <ActivityIndicator color={brandColors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* User Card */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.userCard}>
            <Text style={styles.userName}>{user?.name || 'Funcionário'}</Text>
            <Text style={styles.userRole}>{user?.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Clock color="#6b7280" size={16} />
                <Text style={styles.statText}>Trabalhou: {TimeBankService.formatDecimalToTime(dynamicStats.worked)}h</Text>
              </View>
              <View style={[styles.statPill, dynamicStats.realBalance >= 0 ? styles.pillPositive : styles.pillNegative]}>
                <Text style={[styles.statText, dynamicStats.realBalance >= 0 ? styles.textPositive : styles.textNegative]}>
                  Saldo: {TimeBankService.formatDecimalToTime(dynamicStats.realBalance)}h
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Date Filter & Export Card */}
          <Animated.View entering={FadeInUp.duration(600).delay(150)} style={styles.searchCard}>
            <Text style={styles.searchLabel}>📅 Filtrar Histórico por Período</Text>
            
            <View style={styles.dateInputsContainer}>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.inputLabel}>Data Início</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e: any) => setStartDate(e.target.value)}
                    style={{
                      height: 44,
                      border: '1px solid #d1d5db',
                      borderRadius: 10,
                      padding: '0 12px',
                      fontSize: 14,
                      backgroundColor: '#f9fafb',
                      color: '#111827',
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.dateInput}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#9ca3af"
                  />
                )}
              </View>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.inputLabel}>Data Fim</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e: any) => setEndDate(e.target.value)}
                    style={{
                      height: 44,
                      border: '1px solid #d1d5db',
                      borderRadius: 10,
                      padding: '0 12px',
                      fontSize: 14,
                      backgroundColor: '#f9fafb',
                      color: '#111827',
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <TextInput
                    style={styles.dateInput}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#9ca3af"
                  />
                )}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.exportButton]} 
                onPress={() => exportToCSV(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>📥 Exportar Excel (Filtrado)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.exportButtonSecondary]} 
                onPress={() => exportToCSV(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonTextSecondary}>📥 Exportar Excel (Geral)</Text>
              </TouchableOpacity>
            </View>

            {(startDate !== firstDay || endDate !== lastDay) && (
              <TouchableOpacity 
                onPress={() => {
                  setStartDate(firstDay);
                  setEndDate(lastDay);
                }} 
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>Resetar Filtros (Mês Corrente)</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* History Timeline */}
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.historySection}>
            <View style={styles.sectionHeader}>
              <History color={brandColors.primary} size={24} />
              <Text style={styles.sectionTitle}>Histórico de Batimentos</Text>
            </View>

            <View style={styles.timelineGroup}>
              {filteredEntries.length === 0 ? (
                <View style={styles.timelineCard}>
                  <Text style={styles.emptyText}>
                    Nenhum ponto registrado no período selecionado.
                  </Text>
                </View>
              ) : (
                filteredEntries.map(([dateStr, dailyRecords]) => (
                  <View key={dateStr} style={styles.timelineCard}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{dateStr}</Text>
                      <View style={styles.dailyHoursPill}>
                        <Text style={styles.dailyHoursText}>
                          Total: {TimeBankService.formatDecimalToTime(TimeBankService.calculateDailyHours(dailyRecords))}h
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

                          {/* Se houver foto tirada na facial, exibe */}
                          {record.photo && (
                            <View style={styles.photoContainer}>
                              <Text style={styles.photoLabel}>📸 Foto facial no momento do ponto:</Text>
                              <Image
                                source={{ uri: record.photo }}
                                style={styles.recordPhoto}
                                resizeMode="cover"
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          </Animated.View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: brandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backBtn: { padding: 8, marginRight: 16 },
  headerTitle: { color: brandColors.white, fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 16, alignItems: 'center', width: '100%' },
  userCard: {
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  userRole: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
  },
  pillPositive: { backgroundColor: '#ecfdf5' },
  pillNegative: { backgroundColor: '#fef2f2' },
  statText: { fontWeight: '600', color: '#374151' },
  textPositive: { color: '#10b981' },
  textNegative: { color: '#ef4444' },
  historySection: { width: '100%', maxWidth: 600 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  timelineGroup: { gap: 16 },
  timelineCard: {
    backgroundColor: brandColors.white, padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  dayLabel: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  dailyHoursPill: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dailyHoursText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#6b7280', fontStyle: 'italic', textAlign: 'center' },
  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineConnector: { alignItems: 'center', marginRight: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: brandColors.primary, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 24 },
  recordType: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  recordDetails: { flexDirection: 'row', gap: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 14, color: '#6b7280' },
  searchCard: {
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  dateInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  dateInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: '#111827',
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButton: {
    backgroundColor: brandColors.primary,
  },
  exportButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    color: brandColors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  actionButtonTextSecondary: {
    color: '#374151',
    fontWeight: 'bold',
    fontSize: 13,
  },
  clearSearchBtn: {
    marginTop: 12,
    alignSelf: 'center',
  },
  clearSearchText: {
    color: brandColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  photoContainer: {
    marginTop: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  photoLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  recordPhoto: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
});
