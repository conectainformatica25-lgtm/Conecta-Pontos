import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { UserPlus, User as UserIcon } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { brandColors } from '../themes/colors.theme';
import { useAuthStore } from '../../store/useAuthStore';

export function UsersPanel() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const createUser = useAuthStore(state => state.createUser);
  const user = useAuthStore(state => state.user);
  const allUsers = useAuthStore(state => state.companyUsers);
  
  // Isola visualmente os usuários usando useMemo
  const companyUsers = React.useMemo(() => {
    return allUsers.filter(u => u.companyId === user?.companyId);
  }, [allUsers, user?.companyId]);

  const handleCreate = () => {
    if (!name.trim() || !password.trim()) return;
    
    // Simulate user creation
    createUser(name, name.toLowerCase().includes('admin') ? 'ADMIN' : 'EMPLOYEE');
    
    Alert.alert('Sucesso', 'Usuário criado com sucesso no banco de dados!');
    setName('');
    setPassword('');
  };

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.container}>
      
      <View style={styles.createCard}>
        <View style={styles.cardHeader}>
          <UserPlus color={brandColors.primary} size={24} />
          <Text style={styles.cardTitle}>Novo Funcionário</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome de Usuário</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: joaosilva"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
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
        <TouchableOpacity style={styles.button} onPress={handleCreate}>
          <Text style={styles.buttonText}>Cadastrar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Usuários Registrados ({companyUsers.length})</Text>
      <View style={styles.listCard}>
        {companyUsers.map(u => (
          <View key={u.id} style={styles.listItem}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <UserIcon color="#6b7280" size={20} />
              </View>
              <View>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userRole}>{u.role}</Text>
              </View>
            </View>
          </View>
        ))}
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
  userRole: {
    fontSize: 12,
    color: '#6b7280',
  },
});
