import { apiClient } from './apiClient';

// --- Base64url helpers ---
function bufToB64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function b64urlToBuf(b64url: string): ArrayBuffer {
  let base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// --- Enrollment (admin cadastra biometria do funcionário) ---
export async function enrollBiometric(userId: string): Promise<void> {
  if (!window.isSecureContext || !navigator.credentials || !navigator.credentials.create) {
    throw new Error('A biometria digital exige conexão segura (HTTPS). O dispositivo ou navegador pode não suportar.');
  }

  // 1. Pega o desafio do servidor
  const optRes = await apiClient.post('/auth/webauthn/register-options', { userId });
  const options = optRes.data;

  // 2. Chama a API nativa do navegador (dispara sensor biométrico)
  const credential = await (navigator as any).credentials.create({
    publicKey: {
      ...options,
      challenge: b64urlToBuf(options.challenge),
      user: {
        ...options.user,
        id: b64urlToBuf(options.user.id),
      },
      excludeCredentials: (options.excludeCredentials || []).map((c: any) => ({
        ...c,
        id: b64urlToBuf(c.id),
      })),
    },
  });

  // 3. Converte a resposta para JSON serializável
  const credentialJSON = {
    id: credential.id,
    rawId: bufToB64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufToB64url(credential.response.clientDataJSON),
      attestationObject: bufToB64url(credential.response.attestationObject),
    },
  };

  // 4. Envia ao servidor para verificar e salvar
  await apiClient.post('/auth/webauthn/register-verify', { userId, credential: credentialJSON });
}

// --- Login biométrico ---
export async function loginWithBiometric(email: string): Promise<any> {
  if (!window.isSecureContext || !navigator.credentials || !navigator.credentials.get) {
    throw new Error('Biometria indisponível: exige conexão segura (HTTPS) e suporte do navegador.');
  }

  // 1. Pega as opções de autenticação
  const optRes = await apiClient.post('/auth/webauthn/auth-options', { email });
  const options = optRes.data;
  const userId = options.userId;

  // 2. Chama a API nativa do navegador
  const assertion = await (navigator as any).credentials.get({
    publicKey: {
      ...options,
      challenge: b64urlToBuf(options.challenge),
      allowCredentials: (options.allowCredentials || []).map((c: any) => ({
        ...c,
        id: b64urlToBuf(c.id),
      })),
    },
  });

  // 3. Converte para JSON
  const assertionJSON = {
    id: assertion.id,
    rawId: bufToB64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufToB64url(assertion.response.clientDataJSON),
      authenticatorData: bufToB64url(assertion.response.authenticatorData),
      signature: bufToB64url(assertion.response.signature),
      userHandle: assertion.response.userHandle ? bufToB64url(assertion.response.userHandle) : null,
    },
  };

  // 4. Verifica no servidor e retorna o usuário logado
  const verifyRes = await apiClient.post('/auth/webauthn/auth-verify', { userId, credential: assertionJSON });
  return verifyRes.data;
}
