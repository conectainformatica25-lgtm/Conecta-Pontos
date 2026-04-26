import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { UserPlus, User as UserIcon, Mail, Fingerprint, Scan, KeyRound, Settings2 } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/api/apiClient';

interface Employee { id: string; name: string; email: string; role: string; }
type AuthMethod = 'PASSWORD' | 'FINGERPRINT' | 'FACE';

const AUTH_OPTIONS: { value: AuthMethod; label: string; icon: any; desc: string; color: string }[] = [
  {
    value: 'PASSWORD',
    label: 'Senha',
    icon: KeyRound,
    desc: 'Login com e-mail e senha tradicional.',
    color: '#3b82f6',
  },
  {
    value: 'FINGERPRINT',
    label: 'Impressão Digital',
    icon: Fingerprint,
    desc: 'Usa o leitor biométrico do dispositivo.',
    color: '#10b981',
  },
  {
    value: 'FACE',
    label: 'Reconhecimento Facial',
    icon: Scan,
    desc: 'Usa a câmera frontal para reconhecer o rosto.',
    color: '#8b5cf6',
  },
];

export function UsersPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Auth method config
  const [companyAuthMethod, setCompanyAuthMethod] = useState<AuthMethod>('PASSWORD');
  const [savingAuth, setSavingAuth] = useState(false);

  const user = useAuthStore(state => state.user);

  const loadCompany = async () => {
    if (!user?.companyId) return;
    try {
      const res = await apiClient.get(`/company/${user.companyId}`);
      setCompanyAuthMethod(res.data.authMethod as AuthMethod);
    } catch (e) {
      console.error('Erro ao carregar empresa', e);
    }
  };

  const loadEmployees = async () => {
    if (!user?.companyId) return;
    setFetchingUsers(true);
    try {
      const res = await apiClient.get(`/users/${user.companyId}`);
      setEmployees(res.data);
    } catch (e) {
      console.error('Erro ao carregar funcionários', e);
    } finally {
      setFetchingUsers(false);
    }
  };

  useEffect(() => {
    loadCompany();
    loadEmployees();
  }, [user?.companyId]);

  const handleSaveAuthMethod = async (method: AuthMethod) => {
    if (!user?.companyId) return;
    setSavingAuth(true);
    setCompanyAuthMethod(method);
    try {
      await apiClient.put(`/company/${user.companyId}/auth-method`, { authMethod: method });
      Alert.alert('Configuração Salva', `Método de autenticação alterado para: ${AUTH_OPTIONS.find(o => o.value === method)?.label}`);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
    } finally {
      setSavingAuth(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha nome, e-mail e senha.');
      return;
    }
    if (!user?.companyId) return;

    setLoading(true);
    try {
      await apiClient.post('/users', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'EMPLOYEE',
        companyId: user.companyId,
      });
      Alert.alert('Sucesso', `Funcionário ${name} cadastrado com sucesso!`);
      setName(''); setEmail(''); setPassword('');
      loadEmployees();
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Erro ao criar funcionário.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.container}>

      {/* Configuração de Autenticação */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Settings2 color={brandColors.primary} size={24} />
          <Text style={styles.cardTitle}>Método de Autenticação</Text>
        </View>
        <Text style={styles.cardDesc}>
          Escolha como seus funcionários fazem o login no sistema. Todos usarão o mesmo método.
        </Text>

        <View style={styles.authGrid}>
          {AUTH_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = companyAuthMethod === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.authOption, isSelected && { borderColor: opt.color, backgroundColor: opt.color + '10' }]}
                onPress={() => handleSaveAuthMethod(opt.value)}
                disabled={savingAuth}
              >
                <View style={[styles.authIconBg, { backgroundColor: opt.color + '20' }]}>
                  <Icon size={28} color={opt.color} />
                </View>
                <Text style={[styles.authLabel, isSelected && { color: opt.color }]}>{opt.label}</Text>
                <Text style={styles.authDesc}>{opt.desc}</Text>
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: opt.color }]}>
                    <Text style={styles.selectedText}>✓ Ativo</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {companyAuthMethod === 'FINGERPRINT' && (
          <View style={styles.infoBanner}>
            <Fingerprint size={16} color="#10b981" />
            <Text style={styles.infoText}>
              A impressão digital será solicitada no navegador/app do funcionário usando o sensor biométrico nativo do dispositivo. Compatível com Windows Hello, Touch ID e sensores Android.
            </Text>
          </View>
        )}
        {companyAuthMethod === 'FACE' && (
          <View style={[styles.infoBanner, { borderColor: '#8b5cf620', backgroundColor: '#8b5cf610' }]}>
            <Scan size={16} color="#8b5cf6" />
            <Text style={[styles.infoText, { color: '#6d28d9' }]}>
              O reconhecimento facial será feito pela câmera frontal do dispositivo. O funcionário deverá permitir o acesso à câmera ao fazer login.
            </Text>
          </View>
        )}
      </View>

      {/* Cadastrar Funcionário */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <UserPlus color={brandColors.primary} size={24} />
          <Text style={styles.cardTitle}>Novo Funcionário</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput style={styles.input} placeholder="Ex: João Silva" value={name} onChangeText={setName} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail de Acesso</Text>
          <TextInput
            style={styles.input}
            placeholder="funcionario@empresa.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha Inicial de Acesso</Text>
          <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        </View>
        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={brandColors.white} /> : <Text style={styles.buttonText}>Cadastrar Funcionário</Text>}
        </TouchableOpacity>
      </View>

      {/* Lista de Funcionários */}
      <Text style={styles.sectionTitle}>Funcionários ({employees.length})</Text>
      <View style={styles.listCard}>
        {fetchingUsers ? (
          <ActivityIndicator color={brandColors.primary} style={{ padding: 24 }} />
        ) : employees.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado ainda.</Text>
        ) : (
          employees.map(emp => (
            <View key={emp.id} style={styles.listItem}>
              <View style={styles.avatar}><UserIcon color="#6b7280" size={20} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{emp.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} color="#9ca3af" />
                  <Text style={styles.userEmail}>{emp.email}</Text>
                </View>
                <Text style={styles.userRole}>{emp.role === 'ADMIN' ? '👑 Admin' : '👤 Funcionário'}</Text>
              </View>
            </View>
          ))
        )}
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, maxWidth: 800, width: '100%', alignSelf: 'center', gap: 24 },
  card: {
    backgroundColor: '#fff', padding: 24, borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  cardDesc: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  authGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  authOption: {
    flex: 1,
    minWidth: 150,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  authIconBg: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  authLabel: { fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' },
  authDesc: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 16 },
  selectedBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4,
  },
  selectedText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    marginTop: 16, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#10b98120', backgroundColor: '#10b98108',
  },
  infoText: { flex: 1, fontSize: 13, color: '#065f46', lineHeight: 18 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#374151', fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: brandColors.primary, padding: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  listCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden',
  },
  emptyText: { padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  userEmail: { fontSize: 12, color: '#9ca3af' },
  userRole: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
