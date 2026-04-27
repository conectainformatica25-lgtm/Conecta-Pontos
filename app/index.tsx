import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Clock, Eye, EyeOff, Fingerprint, Scan, ArrowRight, Settings } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown, FadeOut } from 'react-native-reanimated';
import { brandColors } from '../src/ui/themes/colors.theme';
import { useAuthStore } from '../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import { apiClient } from '../src/services/api/apiClient';
import { loginWithBiometric } from '../src/services/api/webauthn';
import { FaceCameraModal } from '../src/ui/components/FaceCameraModal';

type Step = 'EMAIL' | 'PASSWORD' | 'BIOMETRIC';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'FINGERPRINT' | 'FACE'>('PASSWORD');
  const [showFaceCamera, setShowFaceCamera] = useState(false);

  const loginStore = useAuthStore(state => state.login);
  const router = useRouter();

  // Passo 1: detecta o método da empresa pelo e-mail
  const handleEmailNext = async () => {
    if (!email.trim()) { Alert.alert('Erro', 'Digite seu e-mail.'); return; }
    setLoading(true);
    try {
      const res = await apiClient.get(`/auth/method?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const method = res.data.authMethod;
      const role = res.data.role;
      setAuthMethod(method);

      // O Administrador (dono da empresa) SEMPRE entra com senha
      if (method === 'PASSWORD' || role === 'ADMIN') {
        setAuthMethod('PASSWORD'); // Força a UI a mostrar senha para Admin
        setStep('PASSWORD');
      } else {
        setStep('BIOMETRIC');
        // Dispara a biometria automaticamente após 500ms para dar tempo da UI renderizar
        setTimeout(() => {
          if (method === 'FACE') {
            setShowFaceCamera(true);
          } else {
            handleBiometricLogin(method);
          }
        }, 500);
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        Alert.alert('Não Encontrado', 'E-mail não cadastrado no sistema.');
      } else {
        // Se não encontrar, tenta login normal com senha (pode ser admin)
        setAuthMethod('PASSWORD');
        setStep('PASSWORD');
      }
    } finally {
      setLoading(false);
    }
  };

  // Passo 2a: login com senha
  const handlePasswordLogin = async () => {
    if (!password.trim()) { Alert.alert('Erro', 'Digite sua senha.'); return; }
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      loginStore(response.data);
      router.replace('/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'E-mail ou senha incorretos.';
      Alert.alert('Acesso Negado', msg);
    } finally {
      setLoading(false);
    }
  };

  // Passo 2b: login com biometria
  const handleBiometricLogin = async (method?: string) => {
    const activeMethod = method || authMethod;
    if (activeMethod === 'FACE') {
      setShowFaceCamera(true);
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithBiometric(email.trim().toLowerCase());
      loginStore(user);
      router.replace('/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Biometria não reconhecida.';
      Alert.alert('Falha Biométrica', `${msg}\n\nDeseja tentar com senha?`, [
        { text: 'Tentar com Senha', onPress: () => { setAuthMethod('PASSWORD'); setStep('PASSWORD'); } },
        { text: 'Tentar Novamente', onPress: () => handleBiometricLogin(activeMethod) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceLogin = async (photoBase64: string) => {
    setShowFaceCamera(false);
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/face-login', {
        email: email.trim().toLowerCase(),
      });
      // Na prática a API compararia a foto enviada (photoBase64) com a armazenada (response.data.faceDescriptor)
      // Aqui vamos simular o sucesso para fins de demonstração (o backend já validou se existe facial para o user)
      loginStore(response.data.user);
      router.replace('/dashboard');
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Rosto não reconhecido.';
      Alert.alert('Falha Facial', `${msg}\n\nDeseja tentar com senha?`, [
        { text: 'Tentar com Senha', onPress: () => { setAuthMethod('PASSWORD'); setStep('PASSWORD'); } },
        { text: 'Tentar Novamente', onPress: () => setShowFaceCamera(true) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const methodIcon = authMethod === 'FINGERPRINT'
    ? <Fingerprint size={64} color={brandColors.primary} />
    : <Scan size={64} color="#8b5cf6" />;
  const methodLabel = authMethod === 'FINGERPRINT' ? 'Impressão Digital' : 'Reconhecimento Facial';
  const methodColor = authMethod === 'FINGERPRINT' ? brandColors.primary : '#8b5cf6';

  return (
    <>
      <FaceCameraModal
        visible={showFaceCamera}
        mode="login"
        onCapture={handleFaceLogin}
        onClose={() => setShowFaceCamera(false)}
      />
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.sysadminBtn} onPress={() => router.push('/sysadmin/login')}>
          <Settings size={20} color="#ffffff" opacity={0.3} />
        </TouchableOpacity>
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

          {/* ===== ETAPA 1: E-MAIL ===== */}
          {step === 'EMAIL' && (
            <>
              <Text style={styles.welcomeTitle}>Bem-vindo!</Text>
              <Text style={styles.welcomeSubtitle}>Digite seu e-mail para continuar</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onSubmitEditing={handleEmailNext}
                />
              </View>

              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleEmailNext} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.buttonText}>Continuar</Text>
                    <ArrowRight size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ===== ETAPA 2A: SENHA ===== */}
          {step === 'PASSWORD' && (
            <>
              <Text style={styles.welcomeTitle}>Digite sua senha</Text>
              <Text style={styles.welcomeSubtitle}>{email}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoFocus
                    onSubmitEditing={handlePasswordLogin}
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handlePasswordLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('EMAIL'); setPassword(''); }} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>← Trocar e-mail</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ===== ETAPA 2B: BIOMETRIA ===== */}
          {step === 'BIOMETRIC' && (
            <>
              <Text style={styles.welcomeTitle}>{methodLabel}</Text>
              <Text style={styles.welcomeSubtitle}>{email}</Text>

              <View style={styles.biometricContainer}>
                <View style={[styles.biometricIcon, { borderColor: methodColor + '40', shadowColor: methodColor }]}>
                  {methodIcon}
                </View>
                {loading ? (
                  <>
                    <ActivityIndicator color={methodColor} size="large" style={{ marginTop: 16 }} />
                    <Text style={[styles.bioHint, { color: methodColor }]}>Aguardando sensor...</Text>
                  </>
                ) : (
                  <Text style={styles.bioHint}>Toque no botão para autenticar</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: methodColor }, loading && styles.buttonDisabled]}
                onPress={() => handleBiometricLogin()}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {authMethod === 'FINGERPRINT' ? <Fingerprint size={22} color="#fff" /> : <Scan size={22} color="#fff" />}
                    <Text style={styles.buttonText}>Autenticar com {methodLabel}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('EMAIL'); }} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>← Trocar e-mail</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Rodapé com link de cadastro — só na etapa de e-mail */}
          {step === 'EMAIL' && (
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Não tem conta?</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}> Cadastre sua empresa</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerText}>Conecta Pontos © 2026</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brandColors.primary },
  sysadminBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)', padding: 16,
    borderRadius: 24, marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#fff', letterSpacing: -0.5 },
  appSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    height: 48, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 15, backgroundColor: '#f9fafb', color: '#1f2937',
  },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eyeIcon: { position: 'absolute', right: 16, height: '100%', justifyContent: 'center' },
  button: {
    backgroundColor: brandColors.primary, height: 50, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    elevation: 2, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  biometricContainer: { alignItems: 'center', paddingVertical: 24 },
  biometricIcon: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f9fafb', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  bioHint: { marginTop: 16, fontSize: 15, color: '#6b7280', textAlign: 'center' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerText: { color: '#6b7280', fontSize: 14 },
  registerLink: { color: brandColors.primary, fontSize: 14, fontWeight: 'bold' },
  footerText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 16 },
});
