# Regras de Negócio e Sistema (Business Rules)

## 1. Fluxo de Ponto Flexível (CLT)
Diferente de sistemas tradicionais que bloqueiam o ponto baseado em escalas rígidas, este sistema atende múltiplas empresas (Multi-tenant). 
A flexibilidade do banco de horas é chave.

### Marcações Padrão
O sistema aceita primordialmente quatro batimentos por dia:
- `ENTRADA` (Início do expediente)
- `SAIDA_ALMOCO` (Início do intervalo)
- `RETORNO_ALMOCO` (Fim do intervalo)
- `SAIDA` (Fim da jornada de trabalho)

### Banco de Horas
O cálculo não restringe a marcação. As horas diárias são somadas (Tempo total entre Entrada e Saída, subtraído do Intervalo).
O Saldo Diário é = (Horas Trabalhadas) - (Carga Horária Acordada do Funcionário).

## 2. Usuários e Acessos (RBAC Simples)
- `ADMIN`: Administrador e dono da "Company" (Empresa). Tem acesso total ao dashboard, cadastra/edita funcionários, visualiza saldos, bloqueia o ponto ou edita batimentos se necessário.
- `EMPLOYEE`: Acesso restrito via celular ou tela simples para realizar o Batimento. Poderá ver apenas seu histórico de marcações mensal e saldo total do banco de horas.
- Todo funcionário está atrelado obrigatoriamente à uma empresa. O Login aceitará o Nome de Usuário (desvinculado de e-mail) desde que a combinação usuario + senha/token seja informada corretamente pelo banco de dados.

## 3. Relatórios
O `employee` gera mensalmente um relatório validando as entradas do mês corrente para aprovação do banco de horas junto ao `admin`.
