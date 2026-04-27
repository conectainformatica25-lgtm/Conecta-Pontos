import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { apiClient } from '../../src/services/api/apiClient';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function SysAdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const loginStore = useAuthStore(state => state.login);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post('/sysadmin/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      loginStore(response.data);
      router.replace('/sysadmin/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Credenciais inválidas.';
      Alert.alert('Acesso Negado', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#fff" />
      </TouchableOpacity>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={48} color="#ef4444" />
          </View>
          <Text style={styles.appName}>System Admin</Text>
          <Text style={styles.appSubtitle}>Acesso Restrito</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail Administrativo</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha Mestra</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar no Painel</Text>}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 20,
    borderRadius: 30, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: -0.5 },
  appSubtitle: { fontSize: 14, color: '#ef4444', marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: '#1f2937', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: '#374151',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#d1d5db', marginBottom: 8 },
  input: {
    height: 48, borderWidth: 1, borderColor: '#4b5563', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 15, backgroundColor: '#374151', color: '#fff',
  },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eyeIcon: { position: 'absolute', right: 16, height: '100%', justifyContent: 'center' },
  button: {
    backgroundColor: '#ef4444', height: 50, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
