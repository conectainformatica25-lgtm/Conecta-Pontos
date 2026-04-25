import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Criar de um novo registro (Bater ponto)
app.post('/api/records', async (req, res) => {
  try {
    const { userId, companyId, type } = req.body;
    
    // Assegura que o usuário existe para a ForeignKey não falhar
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Como não temos tela de criar usuário ainda, auto-cria para simplificar na POC
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

// Buscar registros do usuário
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

// Buscar registros da empresa
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
