import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { DashboardHeader } from '../src/ui/components/DashboardHeader';
import { ClockPanel } from '../src/ui/components/ClockPanel';
import { UsersPanel } from '../src/ui/components/UsersPanel';
import { ReportsPanel } from '../src/ui/components/ReportsPanel';
import { useAuthStore } from '../src/store/useAuthStore';
import { Clock, Users, FileText } from 'lucide-react-native';
import { brandColors } from '../src/ui/themes/colors.theme';

type Tab = 'PONTO' | 'USUARIOS' | 'RELATORIOS';

export default function DashboardScreen() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState<Tab>('PONTO');

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader />

      {/* Tabs Menu */}
      <View style={styles.tabContainer}>
        <View style={styles.tabGroup}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PONTO' && styles.tabActive]}
            onPress={() => setActiveTab('PONTO')}
          >
            <Clock size={18} color={activeTab === 'PONTO' ? brandColors.white : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'PONTO' && styles.tabTextActive]}>
              Meu Ponto
            </Text>
          </TouchableOpacity>

          {/* Admin só vê Users e relatórios */}
          {user?.role === 'ADMIN' && (
            <>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'USUARIOS' && styles.tabActive]}
                onPress={() => setActiveTab('USUARIOS')}
              >
                <Users size={18} color={activeTab === 'USUARIOS' ? brandColors.white : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'USUARIOS' && styles.tabTextActive]}>
                  Usuários
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'RELATORIOS' && styles.tabActive]}
                onPress={() => setActiveTab('RELATORIOS')}
              >
                <FileText size={18} color={activeTab === 'RELATORIOS' ? brandColors.white : '#6b7280'} />
                <Text style={[styles.tabText, activeTab === 'RELATORIOS' && styles.tabTextActive]}>
                  Relatórios
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Main Content Render */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'PONTO' && <ClockPanel />}
        {activeTab === 'USUARIOS' && user?.role === 'ADMIN' && <UsersPanel />}
        {activeTab === 'RELATORIOS' && user?.role === 'ADMIN' && <ReportsPanel />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6', // Fundo cinza claro que dá contraste
  },
  tabContainer: {
    backgroundColor: brandColors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 10,
  },
  tabGroup: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    maxWidth: 800,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: brandColors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: brandColors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
