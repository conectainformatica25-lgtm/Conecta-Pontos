import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const app = express();
const prisma = new PrismaClient();
const challengeStore = new Map<string, string>(); // userId -> challenge

app.use(cors());
app.use(express.json());

// --- Utilitários ---
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// --- Rotas de Auth ---

// Registrar empresa + admin
app.post('/api/auth/register', async (req, res) => {
  try {
    const { companyName, adminName, email, password, authMethod } = req.body;
    if (!companyName || !adminName || !email || !password) {
      res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'E-mail já cadastrado.' });
      return;
    }

    const company = await prisma.company.create({
      data: { name: companyName, authMethod: authMethod || 'PASSWORD' }
    });
    const user = await prisma.user.create({
      data: {
        name: adminName,
        email,
        password: hashPassword(password),
        role: 'ADMIN',
        companyId: company.id,
      },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      authMethod: company.authMethod,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar empresa.' });
  }
});

// Buscar dados da empresa (incluindo authMethod)
app.get('/api/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      res.status(404).json({ error: 'Empresa não encontrada.' });
      return;
    }
    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar empresa.' });
  }
});

// Atualizar método de autenticação da empresa
app.put('/api/company/:companyId/auth-method', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { authMethod } = req.body;
    if (!['PASSWORD', 'FINGERPRINT', 'FACE'].includes(authMethod)) {
      res.status(400).json({ error: 'Método de autenticação inválido.' });
      return;
    }
    const company = await prisma.company.update({
      where: { id: companyId },
      data: { authMethod },
    });
    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar método de autenticação.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== hashPassword(password)) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// Criar funcionário (pelo admin)
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;
    if (!name || !email || !password || !companyId) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'E-mail já cadastrado.' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword(password),
        role: role || 'EMPLOYEE',
        companyId,
      },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
});

// Listar funcionários da empresa + status biometria
app.get('/api/users/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, companyId: true, webauthnCredentialId: true },
    });
    const result = users.map(u => ({ ...u, biometricEnrolled: !!u.webauthnCredentialId }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// --- Rotas WebAuthn (Biometria) ---

// 1. Gerar opções de cadastro biométrico
app.post('/api/auth/webauthn/register-options', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    const origin = (req.headers.origin as string) || 'https://localhost:3000';
    const rpID = new URL(origin).hostname;

    const options = await generateRegistrationOptions({
      rpName: 'Conecta Pontos',
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      userDisplayName: user.name,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'required',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    challengeStore.set(userId, options.challenge);
    res.json(options);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar opções biométricas.' });
  }
});

// 2. Verificar e salvar cadastro biométrico
app.post('/api/auth/webauthn/register-verify', async (req, res) => {
  try {
    const { userId, credential } = req.body;
    const expectedChallenge = challengeStore.get(userId);
    if (!expectedChallenge) { res.status(400).json({ error: 'Challenge expirado. Tente novamente.' }); return; }

    const origin = (req.headers.origin as string) || 'https://localhost:3000';
    const rpID = new URL(origin).hostname;

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred } = verification.registrationInfo;
      await prisma.user.update({
        where: { id: userId },
        data: {
          webauthnCredentialId: Buffer.from(cred.id).toString('base64'),
          webauthnPublicKey: Buffer.from(cred.publicKey).toString('base64'),
          webauthnCounter: cred.counter,
        },
      });
      challengeStore.delete(userId);
      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Verificação biométrica falhou.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro na verificação biométrica.' });
  }
});

// 3. Gerar opções de autenticação biométrica (login)
app.post('/api/auth/webauthn/auth-options', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.webauthnCredentialId) {
      res.status(404).json({ error: 'Biometria não cadastrada para este e-mail.' });
      return;
    }

    const origin = (req.headers.origin as string) || 'https://localhost:3000';
    const rpID = new URL(origin).hostname;

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials: [{
        id: Buffer.from(user.webauthnCredentialId, 'base64'),
        type: 'public-key',
      }],
    });

    challengeStore.set(user.id, options.challenge);
    res.json({ ...options, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar desafio biométrico.' });
  }
});

// 4. Verificar autenticação biométrica (login)
app.post('/api/auth/webauthn/auth-verify', async (req, res) => {
  try {
    const { userId, credential } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.webauthnCredentialId || !user.webauthnPublicKey) {
      res.status(404).json({ error: 'Biometria não encontrada.' });
      return;
    }

    const expectedChallenge = challengeStore.get(userId);
    if (!expectedChallenge) { res.status(400).json({ error: 'Challenge expirado.' }); return; }

    const origin = (req.headers.origin as string) || 'https://localhost:3000';
    const rpID = new URL(origin).hostname;

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: Buffer.from(user.webauthnCredentialId, 'base64'),
        publicKey: Buffer.from(user.webauthnPublicKey, 'base64'),
        counter: user.webauthnCounter,
      },
      requireUserVerification: true,
    });

    if (verification.verified) {
      await prisma.user.update({
        where: { id: userId },
        data: { webauthnCounter: verification.authenticationInfo.newCounter },
      });
      challengeStore.delete(userId);
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
    } else {
      res.status(401).json({ error: 'Autenticação biométrica falhou.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro na autenticação biométrica.' });
  }
});

// --- Rotas de Ponto ---

app.post('/api/records', async (req, res) => {
  try {
    const { userId, companyId, type } = req.body;
    const record = await prisma.timeRecord.create({
      data: { userId, companyId, type },
    });
    res.status(201).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar ponto' });
  }
});

app.get('/api/records/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const records = await prisma.timeRecord.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
});

app.get('/api/records/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const records = await prisma.timeRecord.findMany({
      where: { companyId },
      orderBy: { timestamp: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar registros gerais' });
  }
});

// --- Servir Frontend ---
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
