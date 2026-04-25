import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { brandColors } from '../src/ui/themes/colors.theme';
import { useAuthStore } from '../src/store/useAuthStore';

export default function RegisterCompanyScreen() {
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [password, setPassword] = useState('');
  
  const registerCompanyAndAdmin = useAuthStore(state => state.registerCompanyAndAdmin);
  const router = useRouter();

  const handleRegister = () => {
    if (!companyName.trim() || !adminName.trim() || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    // Registra a nova empresa criando um UUID único de banco simulado
    registerCompanyAndAdmin(companyName, adminName);
    router.replace('/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={brandColors.white} size={24} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Building2 size={32} color={brandColors.white} />
          </View>
          <Text style={styles.appName}>Cadastro de Empresa</Text>
          <Text style={styles.appSubtitle}>Crie seu ambiente SaaS</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.card}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Empresa</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Minha Empresa LTDA"
              placeholderTextColor="#9ca3af"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Administrador</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor="#9ca3af"
              value={adminName}
              onChangeText={setAdminName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha do Sistema</Text>
            <TextInput
              style={styles.input}
              placeholder="Crie uma senha forte"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Finalizar Cadastro</Text>
          </TouchableOpacity>

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
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 16,
    padding: 8,
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
  button: {
    backgroundColor: brandColors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    elevation: 2,
    shadowColor: brandColors.primaryHover,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
