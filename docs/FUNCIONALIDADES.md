# Funcionalidades — Previsão de Vendas Colaborativa

Documento de referência com detalhamento de todas as funcionalidades do sistema, organizadas em tabelas de 2 colunas: **Funcionalidade** e **Como Funciona / Como é Calculada**.

---

## 1. Dashboard — KPI Cards

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Venda Mês Atual** | Soma de `catN4CdMonthlyForecast[cat][cd][mesAtual]` para todas as categorias N4 e CDs ativos (filtrados ou não). O mês atual é detectado automaticamente por `dataBoundaries.ts` como o primeiro mês de forecast. Exibe variação percentual vs. mês anterior. |
| **Previsão Próximo Mês** | Soma do forecast do mês seguinte ao atual (ex: Mar/26). Calculado da mesma forma que o mês atual, usando o segundo mês de forecast. Exibe variação percentual vs. mesmo mês do ano anterior. |
| **Trimestre Atual** | Soma dos 3 primeiros meses de forecast (ex: Fev+Mar+Abr/26). Todos os CDs e categorias ativas são agregados. Descrição do trimestre exibida abaixo do valor. |
| **Ajustes Realizados** | Exibe `categoriasEditadas / totalCats` (ex: "3 / 19"). O impacto total é a soma da diferença `previsaoAjustada - previsaoOriginal` de todos os ajustes salvos no `forecastStore`. A variação percentual é calculada como `(totalImpact / mesAtual) × 100`. |

---

## 2. Gráfico de Vendas Interativo

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Série: Venda Regular** | Dados de `catN4CdMonthlyHistorico` agregados — soma de todos os CDs (numéricos) e todas as categorias N4 ativas para cada mês no formato `YYYY_MM`. Convertido para formato display `Mmm/YY`. Disponível de Jan/23 a Jan/26 (37 meses). |
| **Série: Quantidade Bruta** | Dados de `catN4CdMonthlyQtdBruta` agregados da mesma forma que Venda Regular. Representa a quantidade total antes de devoluções/cancelamentos. |
| **Série: Previsão Original** | Dados de `catN4CdMonthlyForecast` agregados — soma de todos os CDs (formato string "CD N") e categorias N4 ativas para cada mês no formato `Mmm/YY`. Disponível de Fev/26 a Dez/26 (11 meses). |
| **Série: Previsão Ajustada** | Previsão original multiplicada pelo ratio de ajuste do `monthlyAdjustmentMap[catN4][month]`. Só aparece quando existem ajustes salvos (`hasAdjustedForecast = true`). Linha verde tracejada. |
| **Filtro por Fornecedor** | Quando filtrado por fornecedor, o sistema calcula a **proporção** do fornecedor em cada combinação Cat N4 × CD (baseada na soma de forecast dos produtos filtrados vs. total) e aplica essa proporção aos dados históricos e de forecast. |
| **Eixo X** | Rótulos de meses otimizados (1 a cada 6 meses) com rotação -30° para legibilidade. |
| **Interatividade** | Tooltip ao hover mostra valores de todas as 4 séries. Recharts com responsividade automática. |

---

## 3. Tabela Comparativa por Categoria

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Dados por Categoria** | `comparisonData` derivado dinamicamente em `dataDerived.ts` a partir das estruturas brutas. 19 categorias N4 que possuem dados, ordenadas do maior para o menor valor de `mes0`. |
| **Colunas Mensais — Qtd (Mês 0, 1, 2)** | Previsão do mês atual e dos 2 meses seguintes. Soma de `catN4CdMonthlyForecast[cat][cd][month]` para todos os CDs ativos. Células **editáveis inline**. |
| **Coluna %LY** | Variação vs. mesmo mês do ano anterior: `((valorAtual - valorAnoAnterior) / valorAnoAnterior) × 100`. Cor verde para positivo, vermelho para negativo. |
| **Coluna %LM** | Variação vs. mês anterior: `((mesAtual - mesAnterior) / mesAnterior) × 100`. Apenas no Mês 0. |
| **Colunas Trimestrais** | Soma de 3 meses: **Ano Anterior** (mesmo tri do ano passado), **Penúltimo** (Ago-Out/25), **Último** (Nov-Jan/25-26), **Atual** (Fev-Abr/26). |
| **%LY Trimestral** | `((triAtual - triAnterior) / triAnterior) × 100` |
| **%Penúlt.** | `((triAtual - penTrimestre) / penTrimestre) × 100` |
| **%Últ.** | `((triAtual - ultTrimestre) / ultTrimestre) × 100` |
| **Ordenação** | Categorias ordenadas de maior para menor valor de `mes0` (Qtd do mês atual). |

---

## 4. Edição Inline com Modal de Confirmação

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Ativação** | Clique na célula de Qtd (Mês 0, 1 ou 2) ativa um input numérico. O valor original é mantido em memória. |
| **Confirmação (Enter/Blur)** | Ao confirmar, um **modal de confirmação** é exibido com análise de impacto antes de salvar. |
| **Valor Original vs. Novo** | Modal exibe ambos os valores lado a lado com delta absoluto e percentual. |
| **Cálculo do Percentual** | `percentualAjuste = (novoValor / valorOriginal - 1) × 100` |
| **SKUs Afetados** | Contagem de produtos na categoria via `catN4SkuCounts[categoria]`. |
| **Impacto Trimestral** | `deltaAbsoluto × 3` (projeção simplificada para 3 meses). |
| **Alerta de Variação > 20%** | Ícone de alerta e fundo amarelo quando a variação percentual excede ±20%. |
| **Propagação Proporcional** | Ao confirmar, o percentual de ajuste é aplicado proporcionalmente a todos os SKUs da categoria no mês editado via `forecastEngine.calcAdjustmentDeltaForProduct()`. |
| **Registro no Log** | Cada ajuste gera uma entrada no log de auditoria com timestamp, usuário, item, valores antes/depois e status "Pendente". |
| **Proteção contra Duplo-Clique** | Flag `isProcessingRef` evita que Enter + onBlur disparem dois salvamentos simultâneos. Delay de 200ms no listener de Enter do modal. |

---

## 5. Indicadores de Confiança

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Classificação** | Cada categoria recebe nível **Alta**, **Média** ou **Baixa** via `calculateConfidence()`. |
| **Coeficiente de Variação (CV)** | Calculado sobre os valores trimestrais disponíveis (Ano Anterior, Penúltimo, Último): `CV = (desvio_padrão / média) × 100`. |
| **Thresholds** | **Alta**: CV < 15% e variações < 100%. **Média**: CV 15-40% ou variações entre 100-200%. **Baixa**: CV > 40%, dados nulos ou variações > 200%. |
| **Score Numérico** | Valor de 0 a 100 derivado do CV e da magnitude das variações. Exibido no tooltip com barra de progresso. |
| **Ícone Visual** | Escudo verde (`#059669`) para alta, âmbar (`#d97706`) para média, vermelho (`#dc2626`) para baixa. |
| **Tooltip Detalhado** | Renderizado via React Portal com posicionamento inteligente (detecta limites da viewport). Mostra score, CV%, variação máxima e recomendação. |
| **Resumo no Header** | Contagem de categorias por nível: "3 baixa conf. · 3 média conf. · 13 alta conf." |
| **Dados Nulos** | Categorias sem dados históricos (valores null) recebem automaticamente confiança **Baixa**. |

---

## 6. Mini-Sparklines de Tendência

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Dados** | Agregação de `catN4CdMonthlyHistorico` por categoria — soma de todos os CDs para os últimos 8 meses (Jun/25 a Jan/26). Função `getSparklineData()`. |
| **Dimensão** | SVG compacto de 72×24 pixels, sem dependências externas. |
| **Cor Dinâmica** | Verde para tendência de alta (último valor > primeiro valor), vermelho para tendência de queda. |
| **Gradiente** | Preenchimento com gradiente de cor sob a linha para efeito visual. |
| **Ponto Final** | Círculo destacado no último ponto de dados. |
| **Tooltip** | Tooltip nativo SVG com valores mensais detalhados e variação percentual do período completo. |

---

## 7. Sistema de Filtros Multi-Seleção

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Código Produto** | Campo de texto livre. Busca por código numérico ou nome do produto (case-insensitive). Filtra apenas a tabela de produtos. |
| **Categoria Nível 3** | Multi-seleção com 18 opções. Filtra todas as seções do dashboard. |
| **Categoria Nível 4** | Multi-seleção com 28 opções. Filtra todas as seções do dashboard. |
| **Centro de Distribuição** | Multi-seleção com 9 CDs. Filtra todas as seções. Dados agregados apenas para CDs selecionados. |
| **Comprador** | Multi-seleção com 12 compradores. Filtra todas as seções. |
| **Fornecedor** | Multi-seleção com 57 fornecedores. Filtra todas as seções com **cálculo proporcional**: calcula a proporção do fornecedor em cada Cat N4 × CD e aplica aos dados agregados. |
| **Componente MultiSelectCombobox** | Checkboxes individuais, campo de busca com destaque do texto (case-insensitive), botões "Selecionar todos" / "Desmarcar todos", badges com contagem e remoção individual, navegação por teclado (setas + Enter + Escape). |
| **Web Worker** | Toda a lógica de filtragem e agregação é executada em `filterWorker.ts` em uma thread separada para não bloquear a UI. O `filterEngine.ts` contém a lógica pura. |
| **Debounce de Sincronização** | Mudanças no `forecastStore` são sincronizadas com o `filterStore` com debounce de 100ms para evitar chamadas redundantes ao worker. |

---

## 8. Ajustes Colaborativos

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Ajuste por Categoria (Inline)** | Clicar no valor de Qtd na tabela comparativa, editar, confirmar via modal. O percentual de variação `(novo/original - 1)` é calculado e aplicado proporcionalmente a todos os SKUs da categoria no mês editado. |
| **Ajuste por Percentual** | Na tabela de ajustes, selecionar categoria N4, definir percentual (+/- %), aplicar. Afeta todos os meses do período selecionado via `monthlyValues`. |
| **Propagação Proporcional** | Para cada SKU na categoria ajustada: `deltaForProduct = forecastOriginalSKU × (percentualAjuste / 100)`. O novo forecast do SKU é `original + delta`, limitado a mínimo 0. Calculado por `forecastEngine.calcAdjustmentDeltaForProduct()`. |
| **Web Worker** | Cálculos de propagação executados em `forecastWorker.ts` para não bloquear a UI. |
| **Persistência** | `adjustmentService.ts` salva os ajustes no LocalStorage (chave: `previsao-vendas-ajustes`). Preparado para migração para API REST. |
| **Recálculo Automático** | Ao salvar um ajuste, o `forecastStore` recalcula `adjustedProducts`, `totalImpact`, `categoriasEditadas` e `monthlyAdjustmentMap` via `computeDerivedState()`. O `filterStore` é notificado via subscription e recalcula todas as visualizações. |
| **monthlyAdjustmentMap** | `Record<string, Record<string, number>>` — mapeia `catN4 → month → ratio`. O ratio é o multiplicador aplicado à previsão original: `ratio = 1 + (percentualAjuste / 100)`. |

---

## 9. Log de Auditoria

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Registro Automático** | Cada ajuste gera uma entrada com: `id`, `timestamp`, `usuario`, `level` (CATEGORIA NÍVEL 3/4 ou PRODUTO), `item`, `type` (% ou QTD), `monthlyValues`, `previsaoOriginal`, `previsaoAjustada`, `exported`, `exportedAt`. |
| **Status** | Pendente (recém-criado), Aprovado, Revertido. |
| **Reversão** | Botão de reversão individual remove o ajuste do array `savedAdjustments` e recalcula todo o estado derivado. |
| **Exportação do Log** | Exporta ajustes pendentes (não exportados) em formato JSON com: dados dos ajustes + produtos afetados com forecast original/ajustado/delta por mês. |
| **Marcação de Exportação** | Após exportar, os ajustes são marcados com `exported: true` e `exportedAt: timestamp` via `markAsExported()`. |
| **Painel Expandível** | Componente `AuditLog.tsx` com toggle de exibição e contagem de registros. |

---

## 10. Exportação de Relatórios

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Excel — Aba Resumo** | KPIs (venda mês atual, previsão próximo mês, trimestre atual), período selecionado, filtros ativos, data/hora de geração. Gerado por `exportExcel.ts` com biblioteca SheetJS (xlsx). |
| **Excel — Aba Dados Mensais** | `filteredMonthlyData` completo: mês, venda regular, qtd bruta, previsão, previsão ajustada. Histórico Jan/23-Jan/26 + Forecast Fev/26-Dez/26. |
| **Excel — Aba Comparativo** | Todas as categorias do `filteredComparison` com colunas mensais (Qtd, %LY, %LM) e trimestrais (Ano Anterior, Penúltimo, Último, Atual, variações). |
| **Excel — Aba Produtos** | Lista de `filteredProducts` com código, nome, categoria N3/N4, fornecedor, comprador, CD, forecast original e ajustado. |
| **PDF — Cabeçalho** | KPIs e filtros ativos formatados. Gerado por `exportPdf.ts` com jsPDF + jspdf-autotable. |
| **PDF — Gráfico** | Captura do gráfico de linhas via `html2canvas` com resolução 3x DPI para alta qualidade. O SVG do Recharts é convertido para Canvas → PNG. |
| **PDF — Tabela** | Tabela comparativa formatada via jspdf-autotable com rótulos do eixo X otimizados. |
| **Nome do Arquivo** | Inclui filtro ativo principal, data e hora: `Previsao_Vendas_NOVO_NORDISK_20260209_1430.xlsx`. |

---

## 11. Seletor de Período

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Intervalo** | Configurável de Fev/2026 a Dez/2026 (11 meses de forecast). Os meses são detectados automaticamente por `dataBoundaries.ts`. |
| **Contagem** | Exibe a quantidade de meses selecionados no período. |
| **Impacto** | Afeta colunas visíveis na tabela de ajustes, dados exibidos no gráfico e meses considerados nos KPIs. |
| **Contexto** | Gerenciado por `PeriodContext.tsx`. |

---

## 12. Tabela de Produtos

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Dados** | 881 produtos de `allProducts` (881 registros = SKUs × CDs). Cada entrada é um produto em um CD específico. |
| **Busca Textual** | Campo de busca filtra por código numérico ou nome do produto (case-insensitive). |
| **Paginação** | 20 produtos por página. Navegação entre páginas com indicador de total. |
| **Ordenação** | Colunas ordenáveis por clique no header (código, nome, categoria, forecast). |
| **Forecast Original vs. Ajustado** | Exibe ambos os valores. Quando há ajuste, o forecast ajustado é destacado visualmente com a diferença. |
| **Integração com Filtros** | Tabela reage a todos os 6 filtros do `filterStore`. Os dados exibidos são `filteredProducts`. |

---

## 13. Tema Claro/Escuro

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Toggle** | Botão no header alterna entre tema claro e escuro. |
| **Persistência** | Preferência salva no LocalStorage. |
| **Implementação** | Gerenciado por `ThemeContext.tsx`. Tokens de design definidos em `index.css` usando variáveis CSS com OKLCH. |

---

## 14. Detecção Automática de Fronteiras

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Objetivo** | Quando os dados são atualizados (novo mês de histórico adicionado), toda a aplicação se ajusta automaticamente sem alterações de código. |
| **Mecanismo** | `dataBoundaries.ts` escaneia todas as chaves de `catN4CdMonthlyHistorico` e `catN4CdMonthlyForecast` para encontrar o último mês de histórico e o primeiro mês de forecast. |
| **Saída** | Objeto `DATA_BOUNDARIES` com arrays de meses históricos, meses de forecast e meses combinados, usado por toda a aplicação. |

---

## 15. Arquitetura de Estado com Web Workers

| Funcionalidade | Como Funciona / Como é Calculada |
|---|---|
| **Zustand Stores** | Estado global gerenciado por 3 stores Zustand: `filterStore` (filtros e dados derivados), `forecastStore` (ajustes e propagação), `authStore` (autenticação). |
| **Web Workers** | Cálculos pesados (filtragem de 881 produtos, agregação mensal, propagação de ajustes) executados em threads separadas via `filterWorker.ts` e `forecastWorker.ts` para não bloquear a UI. |
| **Engines** | Lógica de cálculo pura (sem side-effects) em `filterEngine.ts` e `forecastEngine.ts`, facilitando testes unitários. |
| **Sincronização** | `filterStore` se inscreve no `forecastStore` via `useForecastStore.subscribe()` com debounce de 100ms para recalcular visualizações quando ajustes mudam. |
| **Compatibilidade** | `FilterContext.tsx` e `ForecastContext.tsx` são wrappers que re-exportam os stores para compatibilidade com código legado. |
