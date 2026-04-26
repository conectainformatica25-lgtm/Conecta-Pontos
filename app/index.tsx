import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Clock, Eye, EyeOff, Fingerprint, Scan } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { brandColors } from '../src/ui/themes/colors.theme';
import { useAuthStore } from '../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import { apiClient } from '../src/services/api/apiClient';
import { loginWithBiometric } from '../src/services/api/webauthn';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const loginStore = useAuthStore(state => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email: email.trim().toLowerCase(), password });
      loginStore(response.data);
      router.replace('/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Não foi possível fazer login. Verifique sua conexão.';
      Alert.alert('Acesso Negado', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu e-mail primeiro para usar a biometria.');
      return;
    }
    setBioLoading(true);
    try {
      const user = await loginWithBiometric(email.trim().toLowerCase());
      loginStore(user);
      router.replace('/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Falha na autenticação biométrica. Tente com senha.';
      Alert.alert('Biometria Falhou', msg);
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Clock size={32} color={brandColors.white} />
          </View>
          <Text style={styles.appName}>Conecta Pontos</Text>
          <Text style={styles.appSubtitle}>Sistema de Registro de Ponto</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.card}>
          <Text style={styles.welcomeTitle}>Bem-vindo!</Text>
          <Text style={styles.welcomeSubtitle}>Faça login para continuar</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu e-mail"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Digite sua senha"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6b7280" />
                ) : (
                  <Eye size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} activeOpacity={0.8} disabled={loading || bioLoading}>
            {loading ? (
              <ActivityIndicator color={brandColors.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar com Senha</Text>
            )}
          </TouchableOpacity>

          {/* Botão de Login Biométrico */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.bioRow}>
            <TouchableOpacity
              style={[styles.bioButton, { borderColor: '#10b981' }]}
              onPress={handleBiometricLogin}
              disabled={loading || bioLoading}
              activeOpacity={0.8}
            >
              {bioLoading ? <ActivityIndicator color="#10b981" size="small" /> : <Fingerprint size={22} color="#10b981" />}
              <Text style={[styles.bioBtnText, { color: '#10b981' }]}>Digital</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bioButton, { borderColor: '#8b5cf6' }]}
              onPress={handleBiometricLogin}
              disabled={loading || bioLoading}
              activeOpacity={0.8}
            >
              {bioLoading ? <ActivityIndicator color="#8b5cf6" size="small" /> : <Scan size={22} color="#8b5cf6" />}
              <Text style={[styles.bioBtnText, { color: '#8b5cf6' }]}>Facial</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Não tem uma conta SaaS?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}> Cadastre sua empresa</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>Conecta Pontos © 2026</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.white,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  card: {
    backgroundColor: brandColors.white,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: brandColors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: brandColors.primaryHover,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  registerLink: {
    color: brandColors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#9ca3af', fontSize: 13 },
  bioRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  bioButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12,
    backgroundColor: '#fff',
  },
  bioBtnText: { fontSize: 14, fontWeight: '700' },
});
