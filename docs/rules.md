# Regras e Convenções (Rules)

## 1. Clean Code e Estrutura
- **Limite de Linhas Rígido:** Nenhum arquivo neste projeto pode ultrapassar de **300 linhas de código**. Se isso acontecer, ele **DEVE** ser desmembrado em componentes menores ou se extrair lógicas para serviços (camada de domínio).
- **Semantismo:** Variáveis e métodos devem revelar exatamente o que fazem (ex: usar `calculateTimeBankBalance` invés de `calcTime`).
- **Nível de indentação:** Evitar aninhamentos profundos (mais de 3 ou 4 níveis). Retornar o mais cedo possível (Early Return).

## 2. Camadas de Arquitetura (Clean Architecture Base)
- `src/domain`: Contém SOMENTE regras de negócio de Javascript/Typescript puro. Sem acesso a API de UI ou bibliotecas de interface (como expo, gluestack).
- `src/services`: Camada que processa dados assíncronos, store global (Zustand), autenticações e persistência.
- `src/ui/components`: Módulos visuais atômicos que não detém regra de negócio forte (ex: Botão, Campo de Texto).
- `app/`: Telas e Rotas (Controladores visuais) mapeados pelo Expo Router.

## 3. UI, Tema e Animações
- Usar UI fluida com Gluestack UI.
- Personalizações grandes de tema ficam restritas aos arquivos dentro de `src/ui/themes`.
- Evitar criar CSS inline complexo nas telas, extraia para componentes quando repetitivo.

## 4. Padrões de Exportação
- Export defaults geralmente em telas (Rotas do expo router precisam ser default exports).
- Componentes e domínios devem utilizar "named exports" para facilitar refatoração nas IDEs.
