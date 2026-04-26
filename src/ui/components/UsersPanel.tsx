import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { UserPlus, User as UserIcon, Mail } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/api/apiClient';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function UsersPanel() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const user = useAuthStore(state => state.user);

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
    loadEmployees();
  }, [user?.companyId]);

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
      setName('');
      setEmail('');
      setPassword('');
      loadEmployees(); // Recarrega a lista
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Erro ao criar funcionário.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.container}>

      <View style={styles.createCard}>
        <View style={styles.cardHeader}>
          <UserPlus color={brandColors.primary} size={24} />
          <Text style={styles.cardTitle}>Novo Funcionário</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: João Silva"
            value={name}
            onChangeText={setName}
          />
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
          <Text style={styles.label}>Senha de Acesso</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={brandColors.white} /> : <Text style={styles.buttonText}>Cadastrar Funcionário</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Funcionários Registrados ({employees.length})
      </Text>
      <View style={styles.listCard}>
        {fetchingUsers ? (
          <ActivityIndicator color={brandColors.primary} style={{ padding: 24 }} />
        ) : employees.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado ainda.</Text>
        ) : (
          employees.map(emp => (
            <View key={emp.id} style={styles.listItem}>
              <View style={styles.userRow}>
                <View style={styles.avatar}>
                  <UserIcon color="#6b7280" size={20} />
                </View>
                <View>
                  <Text style={styles.userName}>{emp.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Mail size={12} color="#9ca3af" />
                    <Text style={styles.userEmail}>{emp.email}</Text>
                  </View>
                  <Text style={styles.userRole}>{emp.role === 'ADMIN' ? '👑 Admin' : '👤 Funcionário'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
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
    gap: 32,
  },
  createCard: {
    backgroundColor: brandColors.white,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: brandColors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: brandColors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  listCard: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  emptyText: {
    padding: 24,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  userRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
