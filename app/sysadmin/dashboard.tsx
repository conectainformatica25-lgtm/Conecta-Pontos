import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Switch, Alert } from 'react-native';
import { ShieldAlert, Database, Users, Building, LogOut } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { apiClient } from '../../src/services/api/apiClient';
import { useAuthStore } from '../../src/store/useAuthStore';

interface CompanyData {
  id: string;
  name: string;
  authMethod: string;
  isActive: boolean;
  createdAt: string;
  employeeCount: number;
  dbSpaceMB: string;
}

export default function SysAdminDashboardScreen() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user || user.role !== 'SYSADMIN') {
      router.replace('/sysadmin/login');
      return;
    }
    fetchCompanies();
  }, [user]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/sysadmin/companies');
      setCompanies(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as empresas.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      // Atualiza optimisticamente
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, isActive: newStatus } : c));
      
      await apiClient.put(`/sysadmin/companies/${id}/status`, {
        isActive: newStatus
      });
    } catch (error) {
      // Reverte se falhar
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, isActive: currentStatus } : c));
      Alert.alert('Erro', 'Não foi possível alterar o status da empresa.');
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/sysadmin/login');
  };

  const renderCompanyCard = ({ item, index }: { item: CompanyData, index: number }) => (
    <Animated.View entering={FadeInUp.duration(500).delay(index * 100)} style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Building size={24} color={item.isActive ? "#3b82f6" : "#6b7280"} />
          <Text style={[styles.companyName, !item.isActive && styles.textInactive]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.switchContainer}>
          <Text style={[styles.statusText, { color: item.isActive ? '#10b981' : '#ef4444' }]}>
            {item.isActive ? 'Ativo' : 'Bloqueado'}
          </Text>
          <Switch
            value={item.isActive}
            onValueChange={() => toggleCompanyStatus(item.id, item.isActive)}
            trackColor={{ false: '#7f1d1d', true: '#064e3b' }}
            thumbColor={item.isActive ? '#10b981' : '#ef4444'}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Users size={18} color="#9ca3af" />
          <Text style={styles.statValue}>{item.employeeCount}</Text>
          <Text style={styles.statLabel}>Funcionários</Text>
        </View>
        
        <View style={styles.statBox}>
          <Database size={18} color="#9ca3af" />
          <Text style={styles.statValue}>{item.dbSpaceMB} MB</Text>
          <Text style={styles.statLabel}>Espaço Usado</Text>
        </View>

        <View style={styles.statBox}>
          <ShieldAlert size={18} color="#9ca3af" />
          <Text style={styles.statValue}>{item.authMethod}</Text>
          <Text style={styles.statLabel}>Autenticação</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.iconContainer}>
            <ShieldAlert size={28} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.pageTitle}>Painel Mestre</Text>
            <Text style={styles.pageSubtitle}>Gerenciamento de Instâncias</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={22} color="#ef4444" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={{ color: '#9ca3af', marginTop: 12 }}>Carregando dados globais...</Text>
          </View>
        ) : companies.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={{ color: '#9ca3af', fontSize: 16 }}>Nenhuma empresa cadastrada no sistema.</Text>
          </View>
        ) : (
          <FlatList
            data={companies}
            keyExtractor={item => item.id}
            renderItem={renderCompanyCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#1f2937',
    backgroundColor: '#111827', zIndex: 10,
  },
  iconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  pageSubtitle: { fontSize: 13, color: '#9ca3af' },
  logoutBtn: { padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 },
  content: { flex: 1 },
  listContainer: { padding: 20, paddingBottom: 40 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  card: {
    backgroundColor: '#1f2937', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#374151',
  },
  cardInactive: { opacity: 0.8, borderColor: '#7f1d1d' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginLeft: 12, flex: 1 },
  textInactive: { color: '#d1d5db', textDecorationLine: 'line-through' },
  switchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: '#374151', marginBottom: 16 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#f3f4f6', marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#9ca3af' }
});
