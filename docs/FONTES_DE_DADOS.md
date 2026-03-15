# Fontes de Dados — Checklist de Integração

Documento de referência para garantir que todas as fontes de dados foram integradas corretamente com o datalake. Cada fonte lista seus campos, tipos e descrições.

**Como usar:** Marque os checkboxes `[x]` à medida que cada campo for integrado com a API REST de produção.

---

## Sumário

| # | Fonte de Dados | Arquivo de Origem | Registros |
|---|---|---|---|
| 1 | [allProducts](#1-allproducts--produtos-skus) | `mockData.ts` | 881 |
| 2 | [monthlyData](#2-monthlydata--dados-mensais-agregados) | `dataDerived.ts` | ~54 |
| 3 | [cdMonthlyData](#3-cdmonthlydata--forecast-por-centro-de-distribuição) | `mockData.ts` | 9 CDs |
| 4 | [catN4CdMonthlyForecast](#4-catn4cdmonthlyforecast--previsão-por-categoria--cd--mês) | `mockData.ts` | 19 categorias |
| 5 | [catN4CdMonthlyHistorico](#5-catn4cdmonthlyhistorico--histórico-por-categoria--cd--mês) | `mockData.ts` | 19 categorias |
| 6 | [catN4CdMonthlyQtdBruta](#6-catn4cdmonthlyqtdbruta--qtd-bruta-por-categoria--cd--mês) | `mockData.ts` | 19 categorias |
| 7 | [comparisonData](#7-comparisondata--comparativo-por-categoria) | `dataDerived.ts` | 19 |
| 8 | [categoriesNivel3](#8-categoriesnivel3--categorias-nível-3) | `mockData.ts` | 18 |
| 9 | [categoriesNivel4](#9-categoriesnivel4--categorias-nível-4) | `mockData.ts` | 28 |
| 10 | [centrosDistribuicao](#10-centrosdistribuicao--centros-de-distribuição) | `mockData.ts` | 9 |
| 11 | [compradores](#11-compradores--compradores) | `mockData.ts` | 12 |
| 12 | [fornecedores](#12-fornecedores--fornecedores) | `mockData.ts` | 57 |
| 13 | [DATA_BOUNDARIES](#13-data_boundaries--fronteiras-de-dados) | `dataBoundaries.ts` | 1 objeto |
| 14 | [kpiData](#14-kpidata--indicadores-kpi) | `mockData.ts` | 1 objeto |
| 15 | [SavedAdjustment](#15-savedadjustment--ajustes-colaborativos) | `forecastStore.ts` / LocalStorage | variável |
| 16 | [FilterState](#16-filterstate--estado-dos-filtros) | `filterStore.ts` | 1 objeto |

---

## 1. allProducts — Produtos (SKUs)

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 881 registros
**Descrição:** Lista completa de produtos com previsão de vendas por SKU e Centro de Distribuição. Cada produto aparece uma vez por CD em que é distribuído. Os dados foram extraídos do Excel `ETAPA_3_PREVISAO_SKU.xlsx` via script Python.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| codigo | `number` | Código do produto (SKU). Ex: `79444` | [ ] |
| nome | `string` | Nome comercial do produto. Ex: `"MOUNJARO 5MG C/4 SERINGAS+"` | [ ] |
| categoria3 | `string` | Categoria Nível 3 (agrupamento macro). Ex: `"DIABETES"` | [ ] |
| categoria4 | `string` | Categoria Nível 4 (agrupamento detalhado). Ex: `"DIABETES-INJETAVEL"` | [ ] |
| comprador | `string` | Comprador responsável pela categoria. Ex: `"THATYANNE"` | [ ] |
| cd | `string` | Centro de Distribuição. Ex: `"CD 1"` | [ ] |
| fornecedor | `string` | Fornecedor comercial. Ex: `"LILLY MOUNJARO"` | [ ] |
| forecast | `number` | Previsão de vendas ajustada (total do período, em unidades). Ex: `32883` | [ ] |
| originalForecast | `number` | Previsão original do modelo estatístico (antes de ajustes). Ex: `32883` | [ ] |

---

## 2. monthlyData — Dados Mensais Agregados

**Arquivo:** `client/src/lib/dataDerived.ts` (derivado dinamicamente)
**Quantidade:** ~54 registros (Jan/23 a Dez/26)
**Descrição:** Dados mensais agregados para o gráfico de vendas. Calculados dinamicamente a partir de `catN4CdMonthlyHistorico`, `catN4CdMonthlyQtdBruta` e `catN4CdMonthlyForecast`. Meses históricos têm `historico` e `qtdBruta` preenchidos; meses de forecast têm apenas `previsao`.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| month | `string` | Mês no formato display. Ex: `"Jan/23"`, `"Fev/26"` | [ ] |
| historico | `number \| null` | Venda regular histórica em unidades. `null` para meses de forecast. Ex: `159551` | [ ] |
| qtdBruta | `number \| null` | Quantidade bruta histórica (antes de devoluções). `null` para meses de forecast. Ex: `166475` | [ ] |
| previsao | `number \| null` | Previsão do modelo estatístico. `null` para meses históricos. Ex: `245462.24` | [ ] |

---

## 3. cdMonthlyData — Forecast por Centro de Distribuição

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 9 CDs
**Descrição:** Previsão mensal por Centro de Distribuição. Cada CD contém um objeto com dados históricos (vazio no protótipo) e forecast por mês. Usado para desagregação e análise por CD.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [key: CD] | `string` | Identificador do CD. Ex: `"CD 1"`, `"CD 2"`, ..., `"CD 9"` | [ ] |
| historico | `Record<string, number>` | Mapeamento mês → valor histórico. Vazio no protótipo `{}`. | [ ] |
| forecast | `Record<string, number>` | Mapeamento mês → valor de forecast. Ex: `{ "Fev/26": 68367.45, "Mar/26": 78253.53 }` | [ ] |

---

## 4. catN4CdMonthlyForecast — Previsão por Categoria × CD × Mês

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 19 categorias × 9 CDs × ~23 meses
**Descrição:** Previsão de vendas por Categoria Nível 4, Centro de Distribuição e Mês. Estrutura hierárquica de 3 níveis usada como base para todos os cálculos de forecast na aplicação.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [key: categoria] | `string` | Nome da Categoria Nível 4. Ex: `"DIABETES-INJETAVEL"` | [ ] |
| [key: cd] | `string` | Centro de Distribuição no formato string. Ex: `"CD 1"`, `"CD 2"` | [ ] |
| [key: month] | `string` | Mês no formato display. Ex: `"Fev/26"`, `"Mar/26"`, ..., `"Jan/28"` | [ ] |
| [valor] | `number` | Previsão de vendas em unidades. Ex: `68367.45` | [ ] |

---

## 5. catN4CdMonthlyHistorico — Histórico por Categoria × CD × Mês

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 19 categorias × até 9 CDs × 37 meses
**Descrição:** Histórico de vendas regulares por Categoria Nível 4, Centro de Distribuição e Mês. Usado para sparklines, cálculo de confiança e séries históricas do gráfico. Note que as chaves de CD são **números** (não strings) e os meses são no formato **numérico** `YYYY_MM`.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [key: categoria] | `string` | Nome da Categoria Nível 4. Ex: `"DIABETES-INJETAVEL"` | [ ] |
| [key: cd] | `number` | Centro de Distribuição como número. Ex: `1`, `2`, ..., `9` | [ ] |
| [key: month] | `string` | Mês no formato numérico. Ex: `"2023_01"`, `"2025_06"`, `"2026_01"` | [ ] |
| [valor] | `number` | Venda regular histórica em unidades. Ex: `97.0`, `32883.0` | [ ] |

---

## 6. catN4CdMonthlyQtdBruta — Qtd Bruta por Categoria × CD × Mês

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 19 categorias × até 9 CDs × 37 meses
**Descrição:** Quantidade bruta de vendas (antes de devoluções/cancelamentos) por Categoria Nível 4, Centro de Distribuição e Mês. Mesma estrutura que `catN4CdMonthlyHistorico`. Usado para a série "Qtd Bruta" do gráfico.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [key: categoria] | `string` | Nome da Categoria Nível 4. Ex: `"ANTIASMATICO"` | [ ] |
| [key: cd] | `number` | Centro de Distribuição como número. Ex: `1`, `2`, ..., `9` | [ ] |
| [key: month] | `string` | Mês no formato numérico. Ex: `"2023_01"`, `"2025_12"` | [ ] |
| [valor] | `number` | Quantidade bruta em unidades. Ex: `103.0`, `45200.0` | [ ] |

---

## 7. comparisonData — Comparativo por Categoria

**Arquivo:** `client/src/lib/dataDerived.ts` (derivado dinamicamente)
**Quantidade:** 19 registros
**Descrição:** Dados comparativos por Categoria Nível 4, incluindo previsão mensal (3-4 meses) e trimestral (4 trimestres) com variações percentuais. Calculado dinamicamente a partir das estruturas brutas. Apenas as 19 categorias com dados suficientes são incluídas (das 28 totais).

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| categoria | `string` | Nome da Categoria Nível 4. Ex: `"DIABETES-INJETAVEL"` | [ ] |
| mes0 | `number \| null` | Previsão do mês atual (1º mês de forecast). Ex: `180793` | [ ] |
| varLY | `number \| null` | Variação % vs. mesmo mês do ano anterior. Ex: `43.7` | [ ] |
| varLM | `number \| null` | Variação % vs. mês anterior. Ex: `-4.3` | [ ] |
| mes1 | `number \| null` | Previsão do próximo mês (2º mês de forecast). Ex: `209282` | [ ] |
| varLY1 | `number \| null` | Variação %LY do próximo mês. Ex: `45.0` | [ ] |
| mes2 | `number \| null` | Previsão do mês +2 (3º mês de forecast). Ex: `205108` | [ ] |
| varLY2 | `number \| null` | Variação %LY do mês +2. Ex: `66.0` | [ ] |
| mes3 | `number \| null` | Previsão do mês +3 (4º mês de forecast). Ex: `null` | [ ] |
| varLY3 | `number \| null` | Variação %LY do mês +3. Ex: `null` | [ ] |
| triAnterior | `number \| null` | Trimestre do ano anterior (mesmo trimestre, ano passado). Ex: `393587` | [ ] |
| penTrimestre | `number \| null` | Penúltimo trimestre (Ago-Out/25). Ex: `498290` | [ ] |
| ultTrimestre | `number \| null` | Último trimestre (Nov-Jan/25-26). Ex: `573360` | [ ] |
| triAtual | `number \| null` | Trimestre atual (1os 3 meses de forecast). Ex: `595183` | [ ] |
| varTriLY | `number \| null` | Variação % trimestre atual vs. ano anterior. Ex: `51.2` | [ ] |
| varTriPenTri | `number \| null` | Variação % trimestre atual vs. penúltimo. Ex: `19.4` | [ ] |
| varTriUltTri | `number \| null` | Variação % trimestre atual vs. último. Ex: `3.8` | [ ] |

---

## 8. categoriesNivel3 — Categorias Nível 3

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 18 categorias
**Descrição:** Lista de categorias de agrupamento macro dos produtos. Usada como opções do filtro "Categoria Nível 3".

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [valor] | `string` | Nome da categoria. Ex: `"DIABETES"`, `"OFTALMICO"`, `"SIST. CARDIOVASCULAR"` | [ ] |

**Valores:** ANTIALERGICO, ANTIINFLAMATORIO, ANTIREUMATICO, DERMATOLOGICO, DIABETES, DOR E FEBRE, GASTRO, HEMATOLOGICO, IMUNOLOGICO, OFTALMICO, ONCOLOGICO, OSTEOPOROSE, SIST. CARDIOVASCULAR, SIST. GENIT. HORM. SEX., SIST. IMUNOLOGICO, SIST. NERVOSO, SIST. RESPIRATORIO, VITAMINAS E MINERAIS

---

## 9. categoriesNivel4 — Categorias Nível 4

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 28 categorias
**Descrição:** Lista de categorias de agrupamento detalhado dos produtos. Usada como opções do filtro "Categoria Nível 4" e como chave principal nas estruturas de dados mensais.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [valor] | `string` | Nome da categoria. Ex: `"DIABETES-INJETAVEL"`, `"ANTIGLAUCOMATOSO"` | [ ] |

**Valores:** ANALGESICO-ANTITERMICO, ANESTESICO, ANTIALERGICO, ANTIASMATICO, ANTIBIOTICO, ANTIGLAUCOMATOSO, ANTIINFLAMATORIO, ANTILIPIDEMICO, ANTINEURALGICO, ANTIREUMATICO, ANTISEPTICO, CONTRACEPTIVO, DERMATOLOGICO, DIABETES-INJETAVEL, ENXAQUECA, ESCLEROSE MULTIPLA, HEMATOLOGICO, HORMONIO, HPV, IMUNOLOGICO, IMUNOSSUPRESSOR, ONCOLOGICO, OSTEOPOROSE, OUTROS. OFTALMICOS, PROCTOLOGICOS, RETINOIDE, SUPLEMENTOS ENERGETICOS, VITAMINAS E MINERAIS

---

## 10. centrosDistribuicao — Centros de Distribuição

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 9 CDs
**Descrição:** Lista de Centros de Distribuição disponíveis. Usada como opções do filtro "Centro de Distribuição".

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [valor] | `string` | Identificador do CD. Ex: `"CD 1"`, `"CD 2"` | [ ] |

**Valores:** CD 1, CD 2, CD 3, CD 4, CD 5, CD 6, CD 7, CD 8, CD 9

---

## 11. compradores — Compradores

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 12 compradores
**Descrição:** Lista de compradores responsáveis pelas categorias de produtos. Usada como opções do filtro "Comprador".

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [valor] | `string` | Nome do comprador. Ex: `"THATYANNE"`, `"DIEGO"` | [ ] |

**Valores:** ANA PAULA, CICERO, DIEGO, EVA, FLAVIA, HEKTOR FERREIRA RIBAS, JULIANA, LUIZ, MAGYANNY, SOCORRO, THATYANNE, WESLEY TAVARES FERNANDES

---

## 12. fornecedores — Fornecedores

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 57 fornecedores
**Descrição:** Lista de fornecedores comerciais dos produtos. Usada como opções do filtro "Fornecedor". Quando filtrado por fornecedor, o cálculo de dados é proporcional (baseado na participação do fornecedor em cada Cat N4 × CD).

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| [valor] | `string` | Nome do fornecedor. Ex: `"NOVO NORDISK"`, `"LILLY MOUNJARO"` | [ ] |

**Valores:** ABBOTT AME CONSIG, ABBVIE AME CONSIG, ALCON BRASIL RX NOVO, AMGEN AME, ASPEN AME, ASPEN PHARMA, ASTRAZENECA AME CONSIG, BAGO AME, BAUSCH & LOMB, BAYER AME CONSIG, BERGAMO AME CONSIG, BIOLAB AME RX, BIOMM RX, BIOSINTETICA AME CONSIG, BLANVER RX ENDOV INJ, BLANVER S A RX, BOEHRING MED AME CON, CHIESI, CRISTALIA AME, E LILLY AME, E LILLY FARMA, ELFA AME CONSIG, EMS GENERICO, EMS PRESCRICAO EXTR, EUROFARMA DIABETES, FERRING AME, GBIO RX, GEOLAB GENERICOS, GERMED PHARMA GN, GSK FARMA, JANSSEN CILAG AME, LEGRAND PHARMA, LIBBS AME, LILLY MOUNJARO, MEDLEY OTC VIT, MERCK FARMA AME, MUNDIPHARMA, MYLAN, NOVARTIS EMBU AME, NOVARTIS MED, NOVO NORDISK, NOVO NORDISK AME, ONCOPROD, ORGANON, PFIZER AME, SANDOZ EMBU AME, SANDOZ MARCAS, SANOFI AME CONSIGNAD, SANOFI MEDLEY AME, SANOFI MEDLEY SU BGX, SANOFI RX, SCHERING AME CONSIG, TAKEDA AME, TECNOCOLD VACINAS, TEVA AME, VIATRIS GUAR RX, ZODIAC AME

---

## 13. DATA_BOUNDARIES — Fronteiras de Dados

**Arquivo:** `client/src/lib/dataBoundaries.ts`
**Quantidade:** 1 objeto (calculado automaticamente)
**Descrição:** Fronteiras detectadas automaticamente ao escanear os dados brutos de `catN4CdMonthlyHistorico` e `catN4CdMonthlyForecast`. Determina onde termina o histórico e onde começa a previsão. Toda a aplicação utiliza esses valores para se adaptar automaticamente quando novos dados são adicionados.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| firstHistoricalNumeric | `string` | Primeiro mês do histórico em formato numérico. Ex: `"2023_01"` | [ ] |
| lastHistoricalNumeric | `string` | Último mês do histórico em formato numérico. Ex: `"2026_01"` | [ ] |
| lastHistoricalMonth | `string` | Último mês do histórico em formato display. Ex: `"Jan/26"` | [ ] |
| firstForecastMonth | `string` | Primeiro mês de forecast em formato display. Ex: `"Fev/26"` | [ ] |
| firstHistoricalDate | `Date` | Primeiro mês do histórico como objeto Date. | [ ] |
| lastHistoricalDate | `Date` | Último mês do histórico como objeto Date. | [ ] |
| firstForecastDate | `Date` | Primeiro mês de forecast como objeto Date. | [ ] |
| historicalMonths | `string[]` | Array de todos os meses históricos em formato display. Ex: `["Jan/23", "Fev/23", ..., "Jan/26"]` | [ ] |
| forecastMonths | `string[]` | Array de meses de forecast visíveis (máx 11). Ex: `["Fev/26", ..., "Dez/26"]` | [ ] |
| allMonths | `string[]` | Combinação de historicalMonths + forecastMonths. | [ ] |
| allForecastMonthsInData | `string[]` | Todos os meses de forecast encontrados nos dados (pode incluir 2027/2028). | [ ] |

---

## 14. kpiData — Indicadores KPI

**Arquivo:** `client/src/lib/mockData.ts`
**Quantidade:** 1 objeto (placeholder, valores calculados dinamicamente)
**Descrição:** Objeto placeholder com valores zerados. Os KPIs reais são calculados dinamicamente pelo hook `useKpiValues` a partir de `filteredMonthlyData` e `filteredProducts`.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| vendaMesAtual | `number` | Soma do forecast do mês atual para categorias/CDs ativos. Calculado dinâmico. | [ ] |
| previsaoProximoMes | `number` | Soma do forecast do próximo mês. Calculado dinâmico. | [ ] |
| trimestreAtual | `number` | Soma dos 3 primeiros meses de forecast. Calculado dinâmico. | [ ] |
| ajustesRealizados | `number` | Contagem de ajustes salvos. Calculado dinâmico via `forecastStore`. | [ ] |

---

## 15. SavedAdjustment — Ajustes Colaborativos

**Arquivo:** `client/src/types/domain.ts` (tipo) / `client/src/store/forecastStore.ts` (store) / LocalStorage (persistência)
**Quantidade:** Variável (0 a N ajustes)
**Descrição:** Ajustes de previsão feitos pelos compradores. Cada ajuste registra a alteração em um item (categoria ou produto) com valores por mês. Persistidos em LocalStorage (chave: `previsao-vendas-ajustes`), com migração planejada para PostgreSQL via API REST.

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| id | `string` | Identificador único do ajuste (UUID gerado no frontend). | [ ] |
| level | `AdjustmentLevel` | Nível do ajuste: `"CATEGORIA NÍVEL 3"`, `"CATEGORIA NÍVEL 4"` ou `"PRODUTO"`. | [ ] |
| item | `string` | Item ajustado. Ex: `"DIABETES-INJETAVEL"` ou `"79444 - MOUNJARO 5MG"`. | [ ] |
| type | `AdjustmentType` | Tipo do ajuste: `"%"` (percentual) ou `"QTD"` (quantidade absoluta). | [ ] |
| monthlyValues | `Record<string, number>` | Valor do ajuste por mês. Ex: `{ "Fev/26": 3.5, "Mar/26": 3.5 }` (para %). | [ ] |
| previsaoOriginal | `number` | Previsão total original antes do ajuste. | [ ] |
| previsaoAjustada | `number` | Previsão total após o ajuste. | [ ] |
| timestamp | `string` | Data/hora do ajuste em formato ISO 8601. Ex: `"2026-02-08T20:41:00Z"` | [ ] |
| usuario | `string` | Nome do usuário que fez o ajuste. Ex: `"THATYANNE"` | [ ] |
| exported | `boolean` | Se o ajuste já foi exportado para o datalake. | [ ] |
| exportedAt | `string \| null` | Data/hora da exportação. `null` se não exportado. | [ ] |

---

## 16. FilterState — Estado dos Filtros

**Arquivo:** `client/src/store/filterStore.ts`
**Quantidade:** 1 objeto (estado da sessão)
**Descrição:** Estado atual dos filtros aplicados pelo usuário. Gerenciado pelo Zustand store `filterStore`. Cada filtro multi-seleção é um array de strings; quando vazio, significa "todos selecionados" (sem filtro ativo).

| Campo | Tipo | Descrição | Integrado |
|-------|------|-----------|:---------:|
| codigoProduto | `string` | Texto de busca por código/nome do produto. Ex: `""` (vazio = sem filtro). | [ ] |
| categoriaN3 | `string[]` | Categorias Nível 3 selecionadas. Ex: `["DIABETES", "OFTALMICO"]` ou `[]` (todas). | [ ] |
| categoriaN4 | `string[]` | Categorias Nível 4 selecionadas. Ex: `["DIABETES-INJETAVEL"]` ou `[]` (todas). | [ ] |
| centroDistribuicao | `string[]` | CDs selecionados. Ex: `["CD 1", "CD 3"]` ou `[]` (todos). | [ ] |
| comprador | `string[]` | Compradores selecionados. Ex: `["THATYANNE"]` ou `[]` (todos). | [ ] |
| fornecedor | `string[]` | Fornecedores selecionados. Ex: `["NOVO NORDISK"]` ou `[]` (todos). | [ ] |

---

## Mapeamento para API REST de Produção

Referência cruzada entre fontes de dados e endpoints da API (ver `docs/API_SPEC.md`):

| Fonte de Dados | Endpoint da API | Status |
|---|---|---|
| allProducts | `GET /api/v1/products` | [ ] |
| monthlyData | `GET /api/v1/monthly-data` | [ ] |
| comparisonData | `GET /api/v1/comparison` | [ ] |
| categoriesNivel3, categoriesNivel4, centrosDistribuicao, compradores, fornecedores | `GET /api/v1/filters` | [ ] |
| SavedAdjustment (criar) | `POST /api/v1/adjustments` | [ ] |
| SavedAdjustment (listar) | `GET /api/v1/adjustments/log` | [ ] |
| SavedAdjustment (reverter) | `POST /api/v1/adjustments/:id/revert` | [ ] |
| Exportação Excel | `GET /api/v1/export/excel` | [ ] |
| Exportação PDF | `GET /api/v1/export/pdf` | [ ] |
| Webhook Datalake | `POST /api/v1/webhook/datalake-update` | [ ] |
| catN4CdMonthlyForecast, catN4CdMonthlyHistorico, catN4CdMonthlyQtdBruta, cdMonthlyData | Incluídos nas respostas de `/monthly-data` e `/comparison` | [ ] |
| DATA_BOUNDARIES | Derivado automaticamente no frontend a partir dos dados da API | [ ] |
