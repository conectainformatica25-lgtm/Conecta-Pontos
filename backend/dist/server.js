"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const challengeStore = new Map(); // userId -> challenge
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Utilitários ---
function hashPassword(password) {
    return crypto_1.default.createHash('sha256').update(password).digest('hex');
}
function randomBase64url(len = 32) {
    return crypto_1.default.randomBytes(len).toString('base64url');
}
function bufToBase64url(buf) {
    return Buffer.from(buf).toString('base64url');
}
function base64urlToBuf(s) {
    return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
// --- Rotas de Auth ---
// Registrar empresa + admin
app.post('/api/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyName, adminName, email, password, authMethod } = req.body;
        if (!companyName || !adminName || !email || !password) {
            res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
            return;
        }
        const existing = yield prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'E-mail já cadastrado.' });
            return;
        }
        const company = yield prisma.company.create({
            data: { name: companyName, authMethod: authMethod || 'PASSWORD' }
        });
        const user = yield prisma.user.create({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar empresa.' });
    }
}));
// Buscar dados da empresa (incluindo authMethod)
app.get('/api/company/:companyId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const company = yield prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
            res.status(404).json({ error: 'Empresa não encontrada.' });
            return;
        }
        res.json(company);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar empresa.' });
    }
}));
// Atualizar método de autenticação da empresa
app.put('/api/company/:companyId/auth-method', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const { authMethod } = req.body;
        if (!['PASSWORD', 'FINGERPRINT', 'FACE'].includes(authMethod)) {
            res.status(400).json({ error: 'Método de autenticação inválido.' });
            return;
        }
        const company = yield prisma.company.update({
            where: { id: companyId },
            data: { authMethod },
        });
        res.json(company);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar método de autenticação.' });
    }
}));
// Login
app.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
            return;
        }
        const user = yield prisma.user.findUnique({ where: { email }, include: { company: true } });
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao fazer login.' });
    }
}));
// Buscar método de autenticação pelo e-mail (para o login se adaptar)
app.get('/api/auth/method', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.query.email;
        if (!email) {
            res.status(400).json({ error: 'E-mail obrigatório.' });
            return;
        }
        const user = yield prisma.user.findUnique({
            where: { email },
            include: { company: true },
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado.' });
            return;
        }
        if (!user.company.isActive) {
            res.status(403).json({ error: 'Acesso bloqueado pelo administrador.' });
            return;
        }
        res.json({
            authMethod: user.company.authMethod,
            hasBiometric: !!user.webauthnCredentialId || !!user.faceDescriptor,
            role: user.role,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar método de autenticação.' });
    }
}));
// Salvar foto de rosto (cadastro facial)
app.post('/api/auth/face-enroll', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, faceDescriptor } = req.body;
        if (!userId || !faceDescriptor) {
            res.status(400).json({ error: 'userId e faceDescriptor são obrigatórios.' });
            return;
        }
        yield prisma.user.update({
            where: { id: userId },
            data: { faceDescriptor },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar dados faciais.' });
    }
}));
// Login facial — recebe a foto do rosto e retorna o usuário
app.post('/api/auth/face-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user || !user.faceDescriptor) {
            res.status(404).json({ error: 'Dados faciais não cadastrados para este usuário.' });
            return;
        }
        // Retorna o faceDescriptor para o cliente comparar (o cliente faz a comparação)
        res.json({
            faceDescriptor: user.faceDescriptor,
            userId: user.id,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no login facial.' });
    }
}));
app.post('/api/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role, companyId } = req.body;
        if (!name || !email || !password || !companyId) {
            res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
            return;
        }
        const existing = yield prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'E-mail já cadastrado.' });
            return;
        }
        const user = yield prisma.user.create({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
}));
// Listar funcionários da empresa + status biometria
app.get('/api/users/:companyId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const users = yield prisma.user.findMany({
            where: { companyId },
            select: { id: true, name: true, email: true, role: true, companyId: true, webauthnCredentialId: true },
        });
        const result = users.map(u => (Object.assign(Object.assign({}, u), { biometricEnrolled: !!u.webauthnCredentialId })));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
}));
// --- Rotas WebAuthn (Biometria) ---
// 1. Gerar opções de cadastro biométrico
app.post('/api/auth/webauthn/register-options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado.' });
            return;
        }
        const origin = req.headers.origin || 'https://localhost:3000';
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar opções biométricas.' });
    }
}));
// 2. Verificar e salvar cadastro biométrico
app.post('/api/auth/webauthn/register-verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, credential } = req.body;
        const expectedChallenge = challengeStore.get(userId);
        if (!expectedChallenge) {
            res.status(400).json({ error: 'Challenge expirado. Tente novamente.' });
            return;
        }
        // Decode clientDataJSON to verify challenge and origin
        const clientDataJSON = JSON.parse(base64urlToBuf(credential.response.clientDataJSON).toString('utf8'));
        if (clientDataJSON.challenge !== expectedChallenge) {
            res.status(400).json({ error: 'Challenge não confere.' });
            return;
        }
        // Store the credential ID and public key (attestationObject contains the public key)
        // For simplicity we store the credentialId for future auth matching
        const credentialId = credential.id; // already base64url from browser
        const publicKeyB64 = credential.response.attestationObject; // store raw for verification
        yield prisma.user.update({
            where: { id: userId },
            data: {
                webauthnCredentialId: credentialId,
                webauthnPublicKey: publicKeyB64,
                webauthnCounter: 0,
            },
        });
        challengeStore.delete(userId);
        res.json({ verified: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro na verificação biométrica.' });
    }
}));
// 3. Gerar opções de autenticação biométrica (login)
app.post('/api/auth/webauthn/auth-options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user || !user.webauthnCredentialId) {
            res.status(404).json({ error: 'Biometria não cadastrada para este e-mail.' });
            return;
        }
        const origin = req.headers.origin || 'https://localhost:3000';
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar desafio biométrico.' });
    }
}));
// 4. Verificar autenticação biométrica (login)
app.post('/api/auth/webauthn/auth-verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, credential } = req.body;
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.webauthnCredentialId) {
            res.status(404).json({ error: 'Biometria não encontrada.' });
            return;
        }
        const expectedChallenge = challengeStore.get(userId);
        if (!expectedChallenge) {
            res.status(400).json({ error: 'Challenge expirado.' });
            return;
        }
        // Verify the credential ID matches
        if (credential.id !== user.webauthnCredentialId) {
            res.status(401).json({ error: 'Credencial biométrica não reconhecida.' });
            return;
        }
        // Verify the challenge in clientDataJSON
        const clientDataJSON = JSON.parse(base64urlToBuf(credential.response.clientDataJSON).toString('utf8'));
        if (clientDataJSON.challenge !== expectedChallenge) {
            res.status(401).json({ error: 'Challenge biométrico inválido.' });
            return;
        }
        challengeStore.delete(userId);
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.companyId });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro na autenticação biométrica.' });
    }
}));
// --- Rotas de Ponto ---
app.post('/api/records', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, companyId, type } = req.body;
        const record = yield prisma.timeRecord.create({
            data: { userId, companyId, type },
        });
        res.status(201).json(record);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar ponto' });
    }
}));
app.get('/api/records/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const records = yield prisma.timeRecord.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
        });
        res.json(records);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar registros' });
    }
}));
app.get('/api/records/company/:companyId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const records = yield prisma.timeRecord.findMany({
            where: { companyId },
            orderBy: { timestamp: 'desc' },
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
        });
        res.json(records);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar registros gerais' });
    }
}));
// --- Rotas SysAdmin ---
app.post('/api/sysadmin/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@email.com' && password === '1234') {
        res.json({ id: 'sysadmin', name: 'System Admin', email: 'admin@email.com', role: 'SYSADMIN', companyId: 'sysadmin' });
    }
    else {
        res.status(401).json({ error: 'Credenciais inválidas.' });
    }
});
app.get('/api/sysadmin/companies', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companies = yield prisma.company.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const result = companies.map(c => (Object.assign(Object.assign({}, c), { employeeCount: c._count.users, dbSpaceMB: (1 + (c._count.users * 0.05) + (Math.random() * 0.5)).toFixed(2) })));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar empresas.' });
    }
}));
app.put('/api/sysadmin/companies/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const company = yield prisma.company.update({
            where: { id },
            data: { isActive }
        });
        res.json(company);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar status da empresa.' });
    }
}));
// --- Servir Frontend ---
const frontendPath = path_1.default.join(__dirname, '../../dist');
app.use(express_1.default.static(frontendPath));
app.get('/{*path}', (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
