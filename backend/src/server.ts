import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

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
    const { companyName, adminName, email, password } = req.body;
    if (!companyName || !adminName || !email || !password) {
      res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'E-mail já cadastrado.' });
      return;
    }

    const company = await prisma.company.create({ data: { name: companyName } });
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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar empresa.' });
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

// Listar funcionários da empresa
app.get('/api/users/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
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
