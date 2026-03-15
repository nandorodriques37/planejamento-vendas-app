# Previsão de Vendas Colaborativa

**Sistema de ajuste colaborativo de previsão de vendas para o setor farmacêutico varejista.**

Este sistema permite que a equipe comercial visualize, analise e ajuste as previsões estatísticas de vendas em tempo real, integrando dados históricos e previsões geradas pelo datalake da empresa. Faz parte de um conjunto maior de ferramentas de S&OP que inclui Planejamento de Demanda, Planejamento de Estoque, Planejamento de Compras e Diagnósticos por KPIs.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Stack Tecnológica](#stack-tecnológica)
4. [Estrutura de Diretórios](#estrutura-de-diretórios)
5. [Modelo de Dados](#modelo-de-dados)
6. [Funcionalidades](#funcionalidades)
7. [Fluxo de Dados](#fluxo-de-dados)
8. [Instalação e Execução](#instalação-e-execução)
9. [Guia de Migração para Produção](#guia-de-migração-para-produção)
10. [Integração com Datalake](#integração-com-datalake)
11. [Segurança e Autenticação](#segurança-e-autenticação)
12. [Testes](#testes)
13. [Changelog](#changelog)
14. [FAQ Técnico](#faq-técnico)

---

## Visão Geral

### Problema

A empresa possui um modelo estatístico de previsão de vendas que gera previsões por SKU/CD/mês. Porém, a equipe comercial precisa ajustar essas previsões com base em conhecimento de mercado (lançamentos, campanhas, sazonalidade regional, etc.). Sem uma ferramenta centralizada, esses ajustes são feitos em planilhas dispersas, sem rastreabilidade e sem integração com o processo de S&OP.

### Solução

Este sistema fornece uma interface web colaborativa onde:

- O **comercial (comprador)** visualiza a previsão estatística, analisa indicadores de confiança e aplica ajustes por categoria ou por SKU, com confirmação de impacto antes de salvar.
- Os **gestores** acompanham os ajustes realizados via log de auditoria completo, com possibilidade de reversão.
- O **supply chain** exporta os dados ajustados em Excel e PDF para planejamento de compras e estoque.
- A **TI** integra o sistema com o datalake existente via API REST, com documentação completa de endpoints e schemas.

### Usuários-Alvo

| Perfil | Ações Permitidas |
|--------|-----------------|
| Comercial (Comprador) | Visualizar previsões, aplicar ajustes por categoria (inline) e por SKU (percentual), confirmar impacto via modal, exportar relatórios |
| Gestor Comercial | Aprovar/reverter ajustes, visualizar log de auditoria, analisar indicadores de confiança |
| Supply Chain | Visualizar previsões ajustadas, exportar dados para planejamento, analisar tendências via sparklines |
| TI | Administrar sistema, integrar com datalake, gerenciar usuários, consultar documentação técnica |

---

## Arquitetura do Sistema

### Versão Atual (Protótipo Frontend)

```
┌──────────────────────────────────────────────────────────────┐
│                         NAVEGADOR                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐       │
│  │ React 19 │  │ Tailwind │  │ shadcn/ui + Radix    │       │
│  │ + Wouter │  │ CSS 4    │  │ Components           │       │
│  └────┬─────┘  └──────────┘  └──────────────────────┘       │
│       │                                                      │
│  ┌────┴───────────────────────────────────────────────────┐  │
│  │         Zustand Stores (Estado Global)                  │  │
│  │  ┌──────────────┐ ┌────────────────┐ ┌──────────────┐  │  │
│  │  │ filterStore   │ │ forecastStore   │ │ authStore    │  │  │
│  │  │ (filtros      │ │ (ajustes,       │ │ (autenticação│  │  │
│  │  │  multi-sel.)  │ │  auditoria)     │ │  e perfis)   │  │  │
│  │  └──────┬────────┘ └───────┬─────────┘ └──────────────┘  │  │
│  │         │                  │                              │  │
│  │  ┌──────┴────────┐ ┌──────┴──────────┐                   │  │
│  │  │ filterWorker  │ │ forecastWorker   │  ← Web Workers   │  │
│  │  │ (cálculos em  │ │ (propagação de   │    (thread sep.) │  │
│  │  │  background)  │ │  ajustes)        │                   │  │
│  │  └──────┬────────┘ └───────┬─────────┘                   │  │
│  │         │                  │                              │  │
│  │  ┌──────┴────────┐ ┌──────┴──────────┐                   │  │
│  │  │ filterEngine  │ │ forecastEngine   │  ← Engines       │  │
│  │  │ (lógica de    │ │ (lógica de       │    (cálculos)    │  │
│  │  │  agregação)   │ │  previsão)       │                   │  │
│  │  └───────────────┘ └─────────────────┘                   │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │           dataProvider.ts (Camada de Abstração)        │  │
│  │  Re-exporta dados de mockData, dataDerived,            │  │
│  │  dataBoundaries. Futuramente: chamadas à API REST.     │  │
│  └──────────┬────────────────────────┬───────────────────┘  │
│             │                        │                       │
│  ┌──────────┴──────────┐  ┌─────────┴─────────────────┐    │
│  │ mockData.ts (Dados) │  │ dataBoundaries.ts          │    │
│  │ 881 produtos         │  │ (fronteiras auto-detect.)  │    │
│  │ 57 fornecedores      │  ├────────────────────────────┤    │
│  │ 28 categorias N4     │  │ dataDerived.ts             │    │
│  │ 18 categorias N3     │  │ (monthlyData, comparison   │    │
│  │ 9 CDs                │  │  calculados dinamicamente) │    │
│  └──────────────────────┘  └────────────────────────────┘    │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              LocalStorage                              │   │
│  │  (ajustes, log de auditoria, preferências)             │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Versão Produção (Recomendada)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Navegador   │────▶│  API Gateway │────▶│  Backend     │
│  (React SPA) │◀────│  (Nginx)     │◀────│  (Node/NestJS│
└──────────────┘     └──────────────┘     │  + Express)  │
                                           └──────┬───────┘
                                                  │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                        ┌─────┴─────┐       ┌─────┴─────┐      ┌──────┴──────┐
                        │PostgreSQL │       │  Redis    │      │  Datalake   │
                        │(ajustes,  │       │(cache,    │      │  (API REST) │
                        │ auditoria,│       │ sessões)  │      │  previsões  │
                        │ usuários) │       └───────────┘      │  históricas │
                        └───────────┘                          └─────────────┘
```

---

## Stack Tecnológica

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| Frontend | React | 19 | UI reativa e componentizada |
| Roteamento | Wouter | 3.x | Roteamento client-side leve |
| Estilização | Tailwind CSS | 4 | Utility-first CSS |
| Componentes UI | shadcn/ui + Radix UI | latest | Componentes acessíveis e customizáveis |
| Gráficos | Recharts | 2.x | Gráficos de linha interativos |
| Exportação Excel | SheetJS (xlsx) | 0.18 | Geração de planilhas .xlsx |
| Exportação PDF | jsPDF + jspdf-autotable | 4.x/5.x | Geração de relatórios PDF |
| Captura de Tela | html2canvas | 1.4 | Captura do gráfico para PDF |
| Animações | Framer Motion | 12.x | Animações de entrada e transições |
| Ícones | Lucide React | 0.453 | Ícones SVG consistentes |
| Build | Vite | 7.x | Bundler e dev server |
| Linguagem | TypeScript | 5.6 | Tipagem estática |

---

## Estrutura de Diretórios

```
planejamento-vendas-app/
├── client/
│   ├── index.html                        # HTML entry point (Google Fonts CDN)
│   ├── public/                           # Assets estáticos
│   └── src/
│       ├── main.tsx                      # Entry point React
│       ├── App.tsx                       # Rotas e layout principal
│       ├── index.css                     # Tokens de design globais (OKLCH)
│       ├── pages/
│       │   ├── Home.tsx                  # Página principal (dashboard completo)
│       │   └── NotFound.tsx              # Página 404
│       ├── components/
│       │   ├── ui/                       # Componentes shadcn/ui (Button, Card, Dialog, etc.)
│       │   ├── Header.tsx                # Cabeçalho com seletor de período e info do comprador
│       │   ├── KpiCards.tsx              # 4 cards de indicadores-chave (animados)
│       │   ├── SalesChart.tsx            # Gráfico de vendas e previsão (4 séries)
│       │   ├── ComparisonTable.tsx       # Tabela comparativa por categoria com:
│       │   │                             #   - Edição inline com modal de confirmação
│       │   │                             #   - Indicadores de confiança (alta/média/baixa)
│       │   │                             #   - Mini-sparklines SVG de tendência
│       │   │                             #   - Colunas: Penúltimo trimestre e %Penúlt.
│       │   ├── ProductTable.tsx          # Tabela de 881 produtos com busca e paginação
│       │   ├── Filters.tsx               # Painel de filtros com multi-seleção
│       │   ├── MultiSelectCombobox.tsx   # Componente reutilizável de multi-seleção
│       │   ├── AdjustmentTable.tsx       # Tabela de ajustes colaborativos por SKU
│       │   ├── SupplierAdjustment.tsx    # Ajustes por fornecedor
│       │   ├── AuditLog.tsx              # Log de auditoria expandível com exportação
│       │   ├── ExportButtons.tsx         # Botões de exportação Excel/PDF
│       │   ├── ProtectedRoute.tsx        # Rota protegida por autenticação
│       │   ├── ErrorBoundary.tsx         # Tratamento de erros React
│       │   ├── ManusDialog.tsx           # Dialog customizado
│       │   └── Map.tsx                   # Componente de mapa (Google Maps)
│       ├── store/                        # Gerenciamento de estado (Zustand)
│       │   ├── filterStore.ts            # Store de filtros multi-seleção e agregação
│       │   ├── filterEngine.ts           # Lógica de cálculo de filtros e agregação
│       │   ├── filterWorker.ts           # Web Worker para cálculos de filtro em background
│       │   ├── forecastStore.ts          # Store de ajustes, auditoria e propagação
│       │   ├── forecastEngine.ts         # Lógica de cálculo de previsões e ajustes
│       │   ├── forecastWorker.ts         # Web Worker para cálculos de forecast em background
│       │   └── authStore.ts              # Store de autenticação e perfis de usuário
│       ├── contexts/                     # Wrappers de compatibilidade (delegam para stores)
│       │   ├── FilterContext.tsx          # Re-exporta useFilterStore
│       │   ├── ForecastContext.tsx        # Re-exporta useForecastStore
│       │   ├── PeriodContext.tsx          # Estado do período selecionado
│       │   └── ThemeContext.tsx           # Tema claro/escuro
│       ├── services/                     # Camada de serviços e abstração de dados
│       │   ├── dataProvider.ts           # Abstração centralizada de acesso a dados
│       │   ├── api.ts                    # Cliente HTTP para API REST (futuro)
│       │   ├── config.ts                 # Configurações da aplicação
│       │   ├── adjustmentService.ts      # Persistência de ajustes (LocalStorage → API)
│       │   ├── forecastService.ts        # Serviço de previsões
│       │   ├── filterService.ts          # Serviço de filtros
│       │   └── authService.ts            # Serviço de autenticação
│       ├── types/                        # Tipos TypeScript compartilhados
│       │   ├── domain.ts                 # Interfaces de domínio (Product, ComparisonRow, etc.)
│       │   └── api.ts                    # Tipos de request/response da API
│       ├── hooks/                        # Custom hooks
│       └── lib/
│           ├── mockData.ts               # Dados reais extraídos do Excel (881 produtos)
│           │                             #   + catN4CdMonthlyHistorico (Jan/23-Jan/26)
│           │                             #   + catN4CdMonthlyForecast (Fev/26-Jan/28)
│           │                             #   + catN4CdMonthlyQtdBruta (Jan/23-Jan/26)
│           │                             #   + cdMonthlyData (forecast por CD)
│           ├── dataBoundaries.ts         # Detecção automática de fronteiras histórico/forecast
│           ├── dataDerived.ts            # Derivação dinâmica de monthlyData e comparisonData
│           ├── constants.ts              # Constantes globais (meses PT, etc.)
│           ├── dateUtils.ts              # Utilitários de manipulação de datas
│           ├── forecastUtils.ts          # Utilitários de cálculo de previsões
│           ├── exportExcel.ts            # Lógica de exportação Excel (4 abas)
│           ├── exportPdf.ts              # Lógica de exportação PDF (KPIs + gráfico + tabela)
│           ├── exportUtils.ts            # Utilitários compartilhados de exportação
│           └── utils.ts                  # Utilitários gerais (cn, formatação)
├── docs/
│   ├── API_SPEC.md                       # Especificação da API REST para produção
│   ├── DEPLOYMENT.md                     # Guia de deploy e migração para produção
│   ├── CHANGELOG.md                      # Histórico de alterações
│   ├── FUNCIONALIDADES.md                # Detalhamento de funcionalidades (como funciona cada uma)
│   └── FONTES_DE_DADOS.md               # Checklist de campos e fontes de dados para integração
├── server/                               # Placeholder (não usado no protótipo)
├── shared/                               # Placeholder (não usado no protótipo)
├── package.json
├── tsconfig.json
└── README.md                             # Este arquivo
```

---

## Modelo de Dados

### Product (Produto)

```typescript
interface Product {
  codigo: number;          // Código do produto (SKU)
  nome: string;            // Nome do produto
  categoria3: string;      // Categoria Nível 3 (ex: "DIABETES")
  categoria4: string;      // Categoria Nível 4 (ex: "DIABETES-INJETAVEL")
  fornecedor: string;      // Fornecedor comercial (ex: "NOVO NORDISK")
  comprador: string;       // Comprador responsável (ex: "THATYANNE")
  cd: string;              // Centro de Distribuição (ex: "CD 1")
  forecast: number;        // Previsão ajustada (unidades, período total)
  originalForecast: number;// Previsão original do modelo estatístico
}
```

### ComparisonRow (Comparativo por Categoria)

```typescript
interface ComparisonRow {
  categoria: string;            // Nome da Categoria Nível 4
  mes0: number | null;          // Previsão mês atual (Fev/26)
  varLY: number | null;         // Variação vs. mesmo mês ano anterior (%)
  varLM: number | null;         // Variação vs. mês anterior (%)
  mes1: number | null;          // Previsão próximo mês (Mar/26)
  varLY1: number | null;        // Variação LY próximo mês (%)
  mes2: number | null;          // Previsão mês +2 (Abr/26)
  varLY2: number | null;        // Variação LY mês +2 (%)
  mes3: number | null;          // Previsão mês +3 (Mai/26)
  varLY3: number | null;        // Variação LY mês +3 (%)
  triAnterior: number | null;   // Trimestre ano anterior (Fev-Abr/25)
  penTrimestre: number | null;  // Penúltimo trimestre (Ago-Out/25)
  ultTrimestre: number | null;  // Último trimestre (Nov-Jan/25-26)
  triAtual: number | null;      // Trimestre atual (Fev-Abr/26)
  varTriLY: number | null;      // Variação trimestral vs. ano anterior (%)
  varTriPenTri: number | null;  // Variação vs. penúltimo trimestre (%)
  varTriUltTri: number | null;  // Variação vs. último trimestre (%)
}
```

### FilteredMonthlyPoint (Dados Mensais para Gráfico)

```typescript
interface FilteredMonthlyPoint {
  month: string;                    // "Jan/23", "Fev/26", etc.
  historico: number | null;         // Venda regular histórica (unidades)
  qtdBruta: number | null;          // Quantidade bruta histórica
  previsao: number | null;          // Previsão original do modelo
  previsaoAjustada: number | null;  // Previsão após ajustes colaborativos
}
```

### Estruturas de Agregação Mensal

```typescript
// Previsão por Categoria × CD × Mês (forecast)
catN4CdMonthlyForecast: {
  [categoria: string]: {
    [cd: string]: {           // "CD 1", "CD 2", ...
      [month: string]: number // "Fev/26": 12345
    }
  }
}

// Histórico por Categoria × CD × Mês (usado para sparklines e confiança)
catN4CdMonthlyHistorico: {
  [categoria: string]: {
    [cd: number]: {           // 1, 2, 3, ...
      [month: string]: number // "2025_06": 12345
    }
  }
}

// Quantidade Bruta por Categoria × CD × Mês (mesma estrutura do histórico)
catN4CdMonthlyQtdBruta: {
  [categoria: string]: {
    [cd: number]: {           // 1, 2, 3, ...
      [month: string]: number // "2025_06": 12345
    }
  }
}

// Forecast por Centro de Distribuição × Mês
cdMonthlyData: {
  [cd: string]: {             // "CD 1", "CD 2", ...
    historico: Record<string, number>;  // Meses históricos (vazio no protótipo)
    forecast: Record<string, number>;   // "Fev/26": 68367.45
  }
}
```

### Detecção Automática de Fronteiras (DATA_BOUNDARIES)

O arquivo `dataBoundaries.ts` escaneia os dados brutos para determinar automaticamente onde termina o histórico e começa a previsão. Quando a base é atualizada com um novo mês de histórico, toda a aplicação se ajusta automaticamente.

```typescript
DATA_BOUNDARIES: {
  firstHistoricalNumeric: string;    // "2023_01"
  lastHistoricalNumeric: string;     // "2026_01"
  lastHistoricalMonth: string;       // "Jan/26"
  firstForecastMonth: string;        // "Fev/26"
  historicalMonths: string[];        // ["Jan/23", ..., "Jan/26"]
  forecastMonths: string[];          // ["Fev/26", ..., "Dez/26"]
  allMonths: string[];               // Todos os meses combinados
  allForecastMonthsInData: string[]; // Inclui meses até Jan/28
}
```

### Derivação Dinâmica de Dados (dataDerived.ts)

Os arrays `monthlyData` e `comparisonData` são calculados dinamicamente a partir das estruturas brutas (`catN4CdMonthlyHistorico`, `catN4CdMonthlyQtdBruta`, `catN4CdMonthlyForecast`), eliminando a necessidade de arrays pré-calculados estáticos.

### ConfidenceLevel (Indicador de Confiança)

```typescript
type ConfidenceLevel = "alta" | "media" | "baixa";

interface ConfidenceResult {
  level: ConfidenceLevel;    // Classificação da confiança
  score: number;             // Score numérico 0-100
  reasons: string[];         // Razões detalhadas do cálculo
  cv: number;                // Coeficiente de Variação dos trimestres (%)
  maxVar: number;            // Maior variação percentual absoluta
}
```

---

## Funcionalidades

### 1. Dashboard Principal

O dashboard é a página central do sistema, composto por seções modulares que reagem aos filtros aplicados:

- **KPI Cards (4 indicadores)**: Venda mês atual (Fev/2026), previsão próximo mês (Mar/2026), trimestre atual (Fev-Abr/2026), e ajustes realizados com impacto total em unidades. Cada card tem animação de entrada e badge de variação percentual colorido.
- **Gráfico de Linha Interativo**: Histórico de vendas (Jan/2023 a Jan/2026) e previsão (Fev/2026 a Dez/2026) com 4 séries: Venda Regular, Qtd Bruta, Previsão Original e Previsão Ajustada. A linha verde de previsão ajustada aparece somente quando há ajustes salvos.
- **Tabela Comparativa por Categoria**: 19 categorias N4 com dados mensais (3 meses) e trimestrais (4 trimestres), incluindo edição inline, indicadores de confiança e sparklines.
- **Tabela de Produtos**: 881 produtos com busca textual, paginação (20 por página), ordenação por coluna e exibição de previsão original vs. ajustada.

### 2. Sistema de Filtros Multi-Seleção

Todos os 6 filtros suportam **seleção múltipla simultânea**:

| Filtro | Tipo | Valores | Funcionalidade |
|--------|------|---------|----------------|
| Código Produto | Texto livre | Busca por código numérico | Filtra tabela de produtos |
| Categoria Nível 3 | Multi-seleção | 18 categorias | Filtra todas as seções |
| Categoria Nível 4 | Multi-seleção | 28 categorias | Filtra todas as seções |
| Centro de Distribuição | Multi-seleção | 9 CDs | Filtra todas as seções |
| Comprador | Multi-seleção | 12 compradores | Filtra todas as seções |
| Fornecedor | Multi-seleção | 57 fornecedores | Filtra todas as seções (cálculo proporcional) |

Cada dropdown multi-seleção inclui:
- Checkboxes individuais para cada opção
- Campo de busca por digitação (case-insensitive) com destaque do texto buscado
- Botões "Selecionar todos" e "Desmarcar todos"
- Badges com contagem de selecionados e botão X para remoção individual
- Contagem de resultados filtrados
- Navegação por teclado (setas + Enter + Escape)

### 3. Tabela Comparativa Mensal e Trimestral

A tabela comparativa é o componente central de análise, com as seguintes funcionalidades avançadas:

#### 3.1 Edição Inline com Modal de Confirmação

O comprador pode clicar diretamente nos valores de **Qtd** dos meses 0, 1 e 2 para editar. Ao confirmar (Enter ou blur), um **modal de confirmação** é exibido mostrando:

- Valor original vs. novo valor
- Delta absoluto e variação percentual
- Quantidade de SKUs afetados na categoria
- Impacto estimado no trimestre
- Alerta visual para variações acima de 20%

O usuário pode **confirmar** (salva o ajuste, propaga proporcionalmente para os SKUs e registra no log de auditoria) ou **cancelar** (descarta a edição).

#### 3.2 Indicadores Visuais de Confiança

Cada categoria exibe um ícone de escudo colorido indicando o nível de confiança da previsão estatística:

| Nível | Ícone | Cor | Critério |
|-------|-------|-----|----------|
| Alta | Escudo verde | `#059669` | CV < 15% e variações moderadas |
| Média | Escudo âmbar | `#d97706` | CV 15-40% ou variações altas |
| Baixa | Escudo vermelho | `#dc2626` | CV > 40%, dados nulos ou variações extremas |

O cálculo é baseado em:
1. **Coeficiente de Variação (CV)** dos trimestres (Anterior, Penúltimo, Último)
2. **Magnitude das variações %LY** — variações muito altas indicam padrão instável
3. **Presença de dados nulos** — categorias sem histórico têm confiança automaticamente baixa

O header da tabela exibe um resumo: "3 baixa conf. · 3 média conf. · 13 alta conf."

Tooltip detalhado ao hover mostra: score numérico (0-100), barra de progresso, CV%, variação máxima e recomendação de ação.

#### 3.3 Mini-Sparklines de Tendência

Cada categoria exibe um gráfico SVG compacto (72×24px) mostrando a evolução dos últimos 8 meses (Jun/2025 a Jan/2026):

- Dados agregados de todos os CDs para cada categoria
- Linha verde para tendência de alta, vermelha para queda
- Gradiente de preenchimento sob a linha
- Ponto final destacado com círculo
- Tooltip nativo com valores mensais detalhados e variação percentual do período

#### 3.4 Colunas da Tabela

**Seção Mensal (3 meses):**

| Coluna | Descrição |
|--------|-----------|
| Qtd (Mês 0) | Previsão Fev/26 — editável inline |
| %LY | Variação vs. mesmo mês ano anterior |
| %LM | Variação vs. mês anterior |
| Qtd (Mês 1) | Previsão Mar/26 — editável inline |
| %LY | Variação vs. mesmo mês ano anterior |
| Qtd (Mês 2) | Previsão Abr/26 — editável inline |
| %LY | Variação vs. mesmo mês ano anterior |

**Seção Trimestral (4 trimestres + 3 variações):**

| Coluna | Descrição |
|--------|-----------|
| Ano Anterior | Trimestre do ano anterior (Fev-Abr/25) |
| Penúltimo | Penúltimo trimestre (Ago-Out/25) |
| Último | Último trimestre (Nov-Jan/25-26) |
| Atual | Trimestre atual (Fev-Abr/26) |
| %LY | Variação vs. ano anterior |
| %Penúlt. | Variação vs. penúltimo trimestre |
| %Últ | Variação vs. último trimestre |

### 4. Ajustes Colaborativos

Dois modos de ajuste disponíveis:

- **Ajuste por Categoria (inline)**: Clicar no valor de Qtd na tabela comparativa, digitar novo valor, confirmar via modal. O ajuste é propagado proporcionalmente para todos os SKUs da categoria.
- **Ajuste por Percentual**: Selecionar categoria N4 na tabela de ajustes, definir percentual (+/- %), aplicar. Afeta todos os meses do período selecionado.

Características comuns:
- **Persistência** via LocalStorage (migrar para banco em produção)
- **Log de auditoria** com timestamp, usuário, item ajustado, valores antes/depois, status
- **Reversão** de ajustes com um clique
- **Propagação proporcional** para SKUs individuais
- **Recálculo automático** de KPIs, gráfico e tabela comparativa

### 5. Exportação de Relatórios

#### Excel (.xlsx)

Arquivo com 4 abas:
1. **Resumo**: KPIs, período, filtros ativos, data de geração
2. **Dados Mensais**: Histórico + previsão mensal agregada
3. **Comparativo Categorias**: Todas as 19 categorias com variações mensais e trimestrais
4. **Produtos**: Lista completa de produtos com previsão original e ajustada

#### PDF

Relatório visual com:
- Cabeçalho com KPIs e filtros ativos
- Captura do gráfico de linhas em alta resolução (3x DPI)
- Tabela comparativa formatada
- Rótulos do eixo X otimizados (1 a cada 6 meses, rotação -30°)

**Nome do arquivo**: Inclui filtro ativo, data e hora (ex: `Previsao_Vendas_NOVO_NORDISK_20260209_1430.xlsx`)

### 6. Seletor de Período

Intervalo configurável de Fev/2026 a Dez/2026, com exibição da contagem de meses selecionados. Afeta colunas visíveis na tabela de ajustes e dados do gráfico.

### 7. Log de Auditoria

Painel expandível com histórico completo de ajustes:
- Timestamp, usuário, tipo de ajuste, item, ação, detalhe, valores antes/depois
- Status: Pendente, Aprovado, Revertido
- Botão de reversão individual
- Exportação do log em Excel
- Contagem de registros

---

## Fluxo de Dados

```
Excel (ETAPA_3_PREVISAO_SKU.xlsx)
        │
        ▼
  Script Python (extract_simple.py)
        │
        ▼
  mockData.ts (dados estáticos no frontend)
        │
        ├──▶ dataBoundaries.ts (detecta fronteiras histórico/forecast)
        │
        ├──▶ dataDerived.ts (calcula monthlyData + comparisonData)
        │
        └──▶ dataProvider.ts (camada de abstração centralizada)
                  │
                  ├──▶ filterStore + filterWorker (filtra e agrega — multi-seleção)
                  │         │
                  │         ├──▶ KpiCards (indicadores)
                  │         ├──▶ SalesChart (gráfico 4 séries)
                  │         ├──▶ ComparisonTable (categorias + sparklines + confiança)
                  │         └──▶ ProductTable (881 produtos)
                  │
                  └──▶ forecastStore + forecastWorker (ajustes + propagação)
                            │
                            ├──▶ AdjustmentTable (tabela de ajustes por %)
                            ├──▶ ComparisonTable (edição inline → modal → salvar)
                            ├──▶ AuditLog (log de auditoria)
                            └──▶ adjustmentService → LocalStorage (persistência)
```

---

## Instalação e Execução

### Pré-requisitos

- Node.js 22+ (recomendado)
- pnpm 10+ (gerenciador de pacotes)

### Instalação

```bash
# Clonar repositório
git clone <url-do-repositorio>
cd previsao-vendas-mockup

# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev
```

O sistema estará disponível em `http://localhost:3000`.

### Build para Produção

```bash
# Gerar build otimizado
pnpm build

# Os arquivos estáticos serão gerados em dist/
# Servir com qualquer servidor web (Nginx, Apache, etc.)
```

### Dependências Principais

```json
{
  "react": "^19.2.1",
  "react-dom": "^19.2.1",
  "wouter": "^3.3.5",
  "recharts": "^2.15.2",
  "framer-motion": "^12.23.22",
  "xlsx": "^0.18.5",
  "jspdf": "^4.1.0",
  "jspdf-autotable": "^5.0.7",
  "html2canvas": "^1.4.1",
  "lucide-react": "^0.453.0",
  "sonner": "^2.0.7",
  "tailwindcss": "^4.1.14",
  "typescript": "5.6.3",
  "vite": "^7.1.7"
}
```

---

## Guia de Migração para Produção

### Fase 1: Backend API (Prioridade Alta)

Substituir `mockData.ts` por chamadas a uma API REST:

```typescript
// Antes (mockData.ts estático)
import { allProducts, monthlyData } from "@/lib/mockData";

// Depois (API REST)
const response = await fetch("/api/products?fornecedor=NOVO+NORDISK");
const products = await response.json();
```

Consultar `docs/API_SPEC.md` para a especificação completa dos endpoints.

### Fase 2: Banco de Dados (Prioridade Alta)

Substituir LocalStorage por PostgreSQL. Consultar `docs/DEPLOYMENT.md` para o schema completo e scripts de migração.

### Fase 3: Autenticação (Prioridade Média)

Implementar autenticação via SSO corporativo ou JWT com perfis de acesso (viewer, editor, approver, admin).

### Fase 4: Cache e Performance (Prioridade Baixa)

Redis para cache, paginação server-side, WebSocket para atualizações em tempo real.

Consultar `docs/DEPLOYMENT.md` para detalhes completos de cada fase.

---

## Integração com Datalake

### Dados de Entrada (Datalake → Sistema)

```json
{
  "produtos": [
    {
      "codigo_produto": 79444,
      "nome_produto": "MOUNJARO 5MG C/4 SERINGAS+",
      "nome_nivel_3": "DIABETES",
      "nome_nivel_4": "DIABETES-INJETAVEL",
      "fornecedor_comercial": "LILLY MOUNJARO",
      "comprador": "THATYANNE",
      "codigo_deposito_pd": 1,
      "ano_mes": "2026-02",
      "tipo": "forecast",
      "Previsao_Vendas": 32883,
      "Venda_Regular": null,
      "Qtd_Bruta": null
    }
  ]
}
```

### Dados de Saída (Sistema → Datalake)

```json
{
  "ajustes": [
    {
      "id": 1,
      "categoria_n4": "DIABETES-INJETAVEL",
      "mes": "Fev/26",
      "percentual_ajuste": 3.5,
      "valor_original": 2751576,
      "valor_ajustado": 2830912,
      "usuario": "THATYANNE",
      "status": "Aprovado",
      "timestamp": "2026-02-08T20:41:00Z"
    }
  ]
}
```

### Frequência de Atualização

| Dado | Frequência | Direção |
|------|-----------|---------|
| Previsão estatística | Semanal (segunda-feira) | Datalake → Sistema |
| Histórico de vendas | Diário (06:00) | Datalake → Sistema |
| Ajustes colaborativos | Tempo real | Sistema → Datalake |
| Produtos/Categorias | Semanal | Datalake → Sistema |

---

## Segurança e Autenticação

### Recomendações para Produção

1. **HTTPS obrigatório** em todos os endpoints
2. **Autenticação JWT** com refresh tokens (expiração: 1h access, 7d refresh)
3. **CORS restritivo** (apenas domínios da empresa)
4. **Rate limiting** (100 req/min por usuário)
5. **Validação de entrada** em todos os endpoints (zod/joi)
6. **Audit trail** imutável (não permitir DELETE em logs)
7. **Backup diário** do banco de dados
8. **Monitoramento** com alertas (Datadog, New Relic, ou similar)

---

## Testes

### Testes Manuais Realizados

| Cenário | Status |
|---------|--------|
| Dashboard sem filtro (881 produtos, 19 categorias) | ✅ |
| Filtro por fornecedor (KPIs proporcionais) | ✅ |
| Multi-seleção: 2+ categorias N4 simultâneas | ✅ |
| Multi-seleção: 2+ CDs simultâneos | ✅ |
| Multi-seleção: busca por digitação + checkboxes | ✅ |
| Multi-seleção: "Selecionar todos" / "Desmarcar todos" | ✅ |
| Multi-seleção: badges com remoção individual | ✅ |
| Gráfico com variação mensal real (não linha reta) | ✅ |
| Histórico proporcional por fornecedor | ✅ |
| Edição inline: clicar em Qtd, digitar, Enter | ✅ |
| Modal de confirmação: exibição de impacto | ✅ |
| Modal de confirmação: confirmar salva ajuste | ✅ |
| Modal de confirmação: cancelar descarta edição | ✅ |
| Modal de confirmação: alerta para variação > 20% | ✅ |
| Indicadores de confiança: 3 baixa, 3 média, 13 alta | ✅ |
| Indicadores de confiança: tooltip com score e razões | ✅ |
| Sparklines: 19 categorias com tendência correta | ✅ |
| Sparklines: cores verde (alta) / vermelho (queda) | ✅ |
| Sparklines: tooltip com 8 meses de dados | ✅ |
| Tabela comparativa: coluna Penúltimo trimestre | ✅ |
| Tabela comparativa: coluna %Penúlt. | ✅ |
| Tabela comparativa: "Anterior" renomeado para "Ano Anterior" | ✅ |
| Exportação Excel sem filtro (881 produtos) | ✅ |
| Exportação Excel com filtro multi-seleção | ✅ |
| Exportação PDF com captura do gráfico (SVG → Canvas) | ✅ |
| Ajuste colaborativo por percentual | ✅ |
| Ajuste inline com propagação proporcional para SKUs | ✅ |
| Reversão de ajuste | ✅ |
| Log de auditoria com registro de ajustes inline | ✅ |
| Números sem casas decimais | ✅ |
| Tabela de categorias ordenada (maior → menor) | ✅ |

### Testes Automatizados (Recomendados para Produção)

```bash
# Instalar dependências de teste
pnpm add -D vitest @testing-library/react @testing-library/jest-dom

# Executar testes
pnpm test
```

---

## Changelog

Consultar `docs/CHANGELOG.md` para o histórico completo de alterações.

### Resumo das Versões

| Versão | Data | Principais Alterações |
|--------|------|----------------------|
| v1.0 | 08/02/2026 | Dashboard inicial com KPIs, gráfico, tabela comparativa, tabela de produtos, filtros com combobox, ajustes por percentual, exportação Excel/PDF |
| v1.1 | 09/02/2026 | Coluna Penúltimo trimestre e %Penúlt., renomeação "Anterior" → "Ano Anterior" |
| v1.2 | 09/02/2026 | Filtros multi-seleção em todos os dropdowns |
| v1.3 | 09/02/2026 | Edição inline na tabela comparativa com propagação proporcional |
| v1.4 | 09/02/2026 | Modal de confirmação antes do ajuste inline com impacto estimado |
| v1.5 | 09/02/2026 | Indicadores visuais de confiança (alta/média/baixa) por categoria |
| v1.6 | 09/02/2026 | Mini-sparklines SVG de tendência por categoria (últimos 8 meses) |

---

## FAQ Técnico

**P: Por que os dados estão em `mockData.ts` e não em um banco de dados?**
R: Este é um protótipo/mockup. Os dados foram extraídos do Excel `ETAPA_3_PREVISAO_SKU.xlsx` e convertidos para TypeScript estático. Em produção, devem ser substituídos por chamadas à API REST conectada ao datalake.

**P: Como atualizar os dados quando o datalake gerar novas previsões?**
R: Na versão atual, é necessário re-executar o script Python de extração e rebuild. Em produção, a API buscará dados diretamente do datalake.

**P: O sistema suporta múltiplos usuários simultâneos?**
R: Na versão atual (LocalStorage), não. Cada navegador tem seus próprios ajustes. Em produção com banco de dados, sim.

**P: Como adicionar um novo fornecedor ou categoria?**
R: Na versão atual, os dados vêm do Excel. Novos fornecedores/categorias aparecerão automaticamente quando o Excel for atualizado. Em produção, virão do datalake.

**P: Qual o tamanho máximo de dados suportado?**
R: O protótipo foi testado com 881 produtos e 57 fornecedores. Para volumes maiores (10k+ produtos), recomenda-se paginação server-side e lazy loading.

**P: Como funciona o cálculo de confiança?**
R: O sistema calcula o Coeficiente de Variação (CV) dos trimestres históricos e analisa a magnitude das variações percentuais. CV < 15% com variações moderadas = Alta confiança. CV 15-40% ou variações altas = Média. CV > 40%, dados nulos ou variações extremas = Baixa. O score numérico (0-100) é derivado dessas métricas.

**P: Como funciona a propagação de ajustes inline?**
R: Quando o comprador edita o valor de Qtd de uma categoria na tabela comparativa, o sistema calcula o percentual de variação (novo/original - 1) e aplica esse mesmo percentual proporcionalmente a todos os SKUs da categoria no mês editado. O ajuste é registrado no log de auditoria com status "Pendente".

**P: Os filtros multi-seleção afetam todas as seções?**
R: Sim. Ao aplicar filtros, todas as seções (KPIs, gráfico, tabela comparativa, tabela de produtos) são recalculadas. Para fornecedores, o cálculo é proporcional ao peso do fornecedor na categoria.

---

## Contato

Para dúvidas técnicas sobre a implementação, consulte o código-fonte documentado com comentários detalhados em cada arquivo.

**Arquivos-chave para entender o sistema:**

1. `client/src/store/filterStore.ts` — Store Zustand de filtros multi-seleção e agregação
2. `client/src/store/forecastStore.ts` — Store Zustand de ajustes, propagação e auditoria
3. `client/src/store/filterEngine.ts` — Lógica de cálculo de filtros e dados derivados
4. `client/src/store/forecastEngine.ts` — Lógica de cálculo de previsões e ajustes
5. `client/src/services/dataProvider.ts` — Camada de abstração de acesso a dados
6. `client/src/lib/mockData.ts` — Estrutura de dados e dados reais do Excel
7. `client/src/lib/dataBoundaries.ts` — Detecção automática de fronteiras histórico/forecast
8. `client/src/lib/dataDerived.ts` — Derivação dinâmica de monthlyData e comparisonData
9. `client/src/components/ComparisonTable.tsx` — Tabela comparativa com edição inline, confiança e sparklines
10. `client/src/components/MultiSelectCombobox.tsx` — Componente reutilizável de multi-seleção
11. `client/src/pages/Home.tsx` — Layout principal do dashboard
12. `client/src/types/domain.ts` — Interfaces de domínio (Product, ComparisonRow, etc.)
