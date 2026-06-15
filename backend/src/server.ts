import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const challengeStore = new Map<string, string>(); // userId -> challenge

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Configuração VAPID (Web Push) ───────────────────────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_MAILTO      = process.env.VAPID_MAILTO      || 'mailto:admin@conectapontos.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ── Utilitários ──────────────────────────────────────────────────────────────
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function randomBase64url(len = 32): string {
  return crypto.randomBytes(len).toString('base64url');
}

function bufToBase64url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString('base64url');
}

function base64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Mapa de tipos de ponto para labels em português */
const TYPE_LABELS: Record<string, string> = {
  ENTRADA:        '🟢 Entrada',
  SAIDA_ALMOCO:   '🟡 Início do Almoço',
  RETORNO_ALMOCO: '🔵 Retorno do Almoço',
  SAIDA:          '🔴 Saída',
};

/**
 * Envia notificação push para todos os admins da empresa
 * quando um funcionário bate ponto.
 */
async function notifyAdmins(
  companyId: string,
  employeeName: string,
  recordType: string,
  timestamp: Date
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  try {
    // Busca todos os admins da empresa com subscriptions push
    const admins = await prisma.user.findMany({
      where: { companyId, role: 'ADMIN' },
      include: { pushSubscriptions: true },
    });

    const timeStr = timestamp.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

    const payload = JSON.stringify({
      title: `${TYPE_LABELS[recordType] || recordType} — ${employeeName}`,
      body: `Horário: ${timeStr}`,
      employeeName,
      recordType,
      timestamp: timeStr,
      companyId,
    });

    // Envia push para cada subscription de cada admin
    const sendPromises = admins.flatMap((admin) =>
      admin.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err: any) {
          // Se subscription inválida (410 Gone), remove do banco
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          console.error(`Push falhou para ${sub.endpoint.slice(0, 40)}:`, err.message);
        }
      })
    );

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.error('Erro ao enviar notificações push:', err);
  }
}

// ── Rota: Chave pública VAPID ───────────────────────────────────────────────
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(503).json({ error: 'Push notifications não configuradas.' });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ── Rota: Registrar subscription push ──────────────────────────────────────
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { userId, endpoint, p256dh, auth } = req.body;
    if (!userId || !endpoint || !p256dh || !auth) {
      res.status(400).json({ error: 'Dados de subscription incompletos.' });
      return;
    }

    // Upsert: atualiza se o endpoint já existe, cria se não existe
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar subscription.' });
  }
});

// ── Rotas de Auth ────────────────────────────────────────────────────────────

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

// Buscar dados da empresa
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

    const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });
    if (!user || user.password !== hashPassword(password)) {
      res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      return;
    }
    if (!user.company.isActive) {
      res.status(403).json({ error: 'Acesso bloqueado pelo administrador.' });
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

// Buscar método de autenticação pelo e-mail
app.get('/api/auth/method', async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: 'E-mail obrigatório.' }); return; }
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
    if (!user.company.isActive) { res.status(403).json({ error: 'Acesso bloqueado pelo administrador.' }); return; }
    res.json({
      authMethod: user.company.authMethod,
      hasBiometric: !!user.webauthnCredentialId || !!user.faceDescriptor,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar método de autenticação.' });
  }
});

// Salvar foto de rosto (cadastro facial)
app.post('/api/auth/face-enroll', async (req, res) => {
  try {
    const { userId, faceDescriptor } = req.body;
    if (!userId || !faceDescriptor) {
      res.status(400).json({ error: 'userId e faceDescriptor são obrigatórios.' });
      return;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { faceDescriptor },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar dados faciais.' });
  }
});

// Login facial
app.post('/api/auth/face-login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.faceDescriptor) {
      res.status(404).json({ error: 'Dados faciais não cadastrados para este usuário.' });
      return;
    }
    res.json({
      faceDescriptor: user.faceDescriptor,
      userId: user.id,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no login facial.' });
  }
});

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

// ── Rotas WebAuthn (Biometria) ───────────────────────────────────────────────

app.post('/api/auth/webauthn/register-options', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    const origin = (req.headers.origin as string) || 'https://localhost:3000';
    const rpID = new URL(origin).hostname;
    const challenge = randomBase64url();
    challengeStore.set(userId, challenge);

    res.json({
      challenge,
      rp: { name: 'Conecta Pontos', id: rpID },
      user: { id: bufToBase64url(Buffer.from(user.id)), name: user.email, displayName: user.name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: { authenticatorAttachment: 'platform', requireResidentKey: false, userVerification: 'required' },
      excludeCredentials: user.webauthnCredentialId
        ? [{ type: 'public-key', id: user.webauthnCredentialId }]
        : [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar opções biométricas.' });
  }
});

app.post('/api/auth/webauthn/register-verify', async (req, res) => {
  try {
    const { userId, credential } = req.body;
    const expectedChallenge = challengeStore.get(userId);
    if (!expectedChallenge) { res.status(400).json({ error: 'Challenge expirado. Tente novamente.' }); return; }

    const clientDataJSON = JSON.parse(base64urlToBuf(credential.response.clientDataJSON).toString('utf8'));
    if (clientDataJSON.challenge !== expectedChallenge) {
      res.status(400).json({ error: 'Challenge não confere.' }); return;
    }

    const credentialId = credential.id;
    const publicKeyB64 = credential.response.attestationObject;

    await prisma.user.update({
      where: { id: userId },
      data: {
        webauthnCredentialId: credentialId,
        webauthnPublicKey: publicKeyB64,
        webauthnCounter: 0,
      },
    });
    challengeStore.delete(userId);
    res.json({ verified: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro na verificação biométrica.' });
  }
});

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
    const challenge = randomBase64url();
    challengeStore.set(user.id, challenge);

    res.json({
      challenge,
      timeout: 60000,
      rpId: rpID,
      userVerification: 'required',
      allowCredentials: [{ type: 'public-key', id: user.webauthnCredentialId }],
      userId: user.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar desafio biométrico.' });
  }
});

app.post('/api/auth/webauthn/auth-verify', async (req, res) => {
  try {
    const { userId, credential } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.webauthnCredentialId) {
      res.status(404).json({ error: 'Biometria não encontrada.' }); return;
    }

    const expectedChallenge = challengeStore.get(userId);
    if (!expectedChallenge) { res.status(400).json({ error: 'Challenge expirado.' }); return; }

    if (credential.id !== user.webauthnCredentialId) {
      res.status(401).json({ error: 'Credencial biométrica não reconhecida.' }); return;
    }

    const clientDataJSON = JSON.parse(base64urlToBuf(credential.response.clientDataJSON).toString('utf8'));
    if (clientDataJSON.challenge !== expectedChallenge) {
      res.status(401).json({ error: 'Challenge biométrico inválido.' }); return;
    }

    challengeStore.delete(userId);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro na autenticação biométrica.' });
  }
});

// ── Rotas de Ponto ───────────────────────────────────────────────────────────

app.post('/api/records', async (req, res) => {
  try {
    const { userId, companyId, type, photo } = req.body;

    // Busca o nome do funcionário para a notificação
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const record = await prisma.timeRecord.create({
      data: { userId, companyId, type, photo },
    });

    res.status(201).json(record);

    // Envia notificação push para os admins (em background, não bloqueia a resposta)
    if (employee) {
      notifyAdmins(companyId, employee.name, type, record.timestamp).catch(console.error);
    }
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

app.get('/api/records/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, rangeOnly } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true }
    });

    if (!user) {
      res.status(404).send('Usuário não encontrado.');
      return;
    }

    const records = await prisma.timeRecord.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' },
    });

    // Agrupa por dia
    const grouped: Record<string, typeof records> = {};
    for (const r of records) {
      const dateStr = new Date(r.timestamp).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(r);
    }

    // Filtra por período
    let entries = Object.entries(grouped);
    if (rangeOnly === 'true') {
      entries = entries.filter(([dateStr]) => {
        const [day, month, year] = dateStr.split('/').map(Number);
        const itemDate = new Date(year, month - 1, day);
        itemDate.setHours(0, 0, 0, 0);

        if (startDate) {
          const start = new Date(startDate as string + 'T00:00:00');
          if (itemDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate as string + 'T00:00:00');
          if (itemDate > end) return false;
        }
        return true;
      });
    }

    // Ordena ascendente
    entries.sort(([dateStrA], [dateStrB]) => {
      const [dA, mA, yA] = dateStrA.split('/').map(Number);
      const [dB, mB, yB] = dateStrB.split('/').map(Number);
      return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
    });

    const calculateDailyHours = (dayRecords: typeof records): number => {
      if (dayRecords.length < 2) return 0;
      let totalMs = 0;
      const entrada = dayRecords.find(r => r.type === 'ENTRADA')?.timestamp;
      const saidaAlmoco = dayRecords.find(r => r.type === 'SAIDA_ALMOCO')?.timestamp;
      const retornoAlmoco = dayRecords.find(r => r.type === 'RETORNO_ALMOCO')?.timestamp;
      const saida = dayRecords.find(r => r.type === 'SAIDA')?.timestamp;

      if (entrada && saidaAlmoco) {
        totalMs += new Date(saidaAlmoco).getTime() - new Date(entrada).getTime();
      } else if (entrada && saida && !saidaAlmoco && !retornoAlmoco) {
        totalMs += new Date(saida).getTime() - new Date(entrada).getTime();
      }
      if (retornoAlmoco && saida) {
        totalMs += new Date(saida).getTime() - new Date(retornoAlmoco).getTime();
      }
      return totalMs / (1000 * 60 * 60);
    };

    const formatDecimalToTime = (decimalHours: number): string => {
      const isNegative = decimalHours < 0;
      const absHours = Math.abs(decimalHours);
      const h = Math.floor(absHours);
      const m = Math.round((absHours - h) * 60);
      return `${isNegative ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const csvRows: string[] = [];
    csvRows.push(`Relatório de Ponto - ${user.name}`);
    csvRows.push(`Período: ${rangeOnly === 'true' ? `${startDate} até ${endDate}` : 'Geral (Todos os registros)'}`);
    csvRows.push(`Cargo: ${user.role === 'ADMIN' ? 'Administrador' : 'Funcionário'}`);
    csvRows.push(`Empresa: ${user.company.name}`);
    csvRows.push('');
    csvRows.push('Data;Entrada;Almoço (Saída);Almoço (Retorno);Saída;Total Trabalhado;Saldo do Dia');

    let grandTotalWorked = 0;
    let totalExpected = 0;

    for (const [dateStr, dailyRecords] of entries) {
      const entradaTime = dailyRecords.find(r => r.type === 'ENTRADA')
        ? new Date(dailyRecords.find(r => r.type === 'ENTRADA')!.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : '-';

      const almoçoSaida = dailyRecords.find(r => r.type === 'SAIDA_ALMOCO')
        ? new Date(dailyRecords.find(r => r.type === 'SAIDA_ALMOCO')!.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : '-';

      const almoçoRetorno = dailyRecords.find(r => r.type === 'RETORNO_ALMOCO')
        ? new Date(dailyRecords.find(r => r.type === 'RETORNO_ALMOCO')!.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : '-';

      const saidaTime = dailyRecords.find(r => r.type === 'SAIDA')
        ? new Date(dailyRecords.find(r => r.type === 'SAIDA')!.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        : '-';

      const dailyWorked = calculateDailyHours(dailyRecords);
      const dailyBalance = dailyWorked - 8;

      grandTotalWorked += dailyWorked;
      totalExpected += 8;

      const workedStr = formatDecimalToTime(dailyWorked);
      const balanceStr = formatDecimalToTime(dailyBalance);

      csvRows.push(`${dateStr};${entradaTime};${almoçoSaida};${almoçoRetorno};${saidaTime};${workedStr}h;${balanceStr}h`);
    }

    csvRows.push('');
    csvRows.push(`Total de Horas Trabalhadas;${formatDecimalToTime(grandTotalWorked)}h`);
    csvRows.push(`Saldo Geral do Período;${formatDecimalToTime(grandTotalWorked - totalExpected)}h`);

    const csvContent = Buffer.concat([
      Buffer.from([0xEF, 0xBB, 0xBF]),
      Buffer.from(csvRows.join('\r\n'), 'utf-8')
    ]);

    const filename = `relatorio_ponto_${user.name.replace(/\s+/g, '_')}_${rangeOnly === 'true' ? `${startDate}_a_${endDate}` : 'geral'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Erro ao gerar exportação', error);
    res.status(500).send('Erro interno ao gerar planilha.');
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

// ── Rotas SysAdmin ───────────────────────────────────────────────────────────

app.post('/api/sysadmin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@email.com' && password === '1234') {
    res.json({ id: 'sysadmin', name: 'System Admin', email: 'admin@email.com', role: 'SYSADMIN', companyId: 'sysadmin' });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas.' });
  }
});

app.get('/api/sysadmin/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const result = companies.map(c => ({
      ...c,
      employeeCount: c._count.users,
      dbSpaceMB: (1 + (c._count.users * 0.05) + (Math.random() * 0.5)).toFixed(2)
    }));
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar empresas.' });
  }
});

app.put('/api/sysadmin/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const company = await prisma.company.update({
      where: { id },
      data: { isActive }
    });
    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status da empresa.' });
  }
});

// ── Servir Frontend ─────────────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  if (VAPID_PUBLIC_KEY) {
    console.log('🔔 Web Push VAPID configurado ✅');
  } else {
    console.log('⚠️  VAPID não configurado — notificações push desabilitadas');
  }
});
