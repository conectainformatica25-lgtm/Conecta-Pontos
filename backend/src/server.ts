import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/records', async (req, res) => {
  try {
    const { userId, companyId, type } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await prisma.user.create({
        data: {
          id: userId,
          companyId,
          name: 'Usuário Temporário',
          email: `${userId}@empresa.com`,
        }
      });
    }

    const record = await prisma.timeRecord.create({
      data: { userId, companyId, type }
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
      orderBy: { timestamp: 'desc' }
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
      include: { user: true }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar registros gerais' });
  }
});

// Servir o Frontend SPA estático no mesmo servidor para evitar erros de CORS e URL
const frontendPath = path.join(__dirname, '../../dist');
app.use(express.static(frontendPath));

// Fallback para o React Router (Expo Router)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Funcional em portas dinâmicas ${PORT}`);
});
