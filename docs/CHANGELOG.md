# Changelog — Previsão de Vendas Colaborativa

Todas as alterações notáveis deste projeto são documentadas neste arquivo. O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [v1.6] — 2026-02-09

### Adicionado
- **Mini-sparklines SVG** na tabela comparativa: cada categoria exibe um gráfico de tendência compacto (72×24px) com os últimos 8 meses de histórico (Jun/2025 a Jan/2026).
- Dados agregados de todos os CDs para cada categoria.
- Cores dinâmicas: verde para tendência de alta, vermelho para tendência de queda.
- Gradiente de preenchimento sob a linha e ponto final destacado com círculo.
- Tooltip nativo SVG com valores mensais detalhados e variação percentual do período.

### Técnico
- Componente `Sparkline` criado dentro de `ComparisonTable.tsx` usando SVG puro (sem dependências externas).
- Função `getSparklineData()` agrega `catN4CdMonthlyHistorico` por categoria.
- Meses utilizados: `2025_06` a `2026_01` (8 pontos de dados).

---

## [v1.5] — 2026-02-09

### Adicionado
- **Indicadores visuais de confiança** na tabela comparativa: ícone de escudo colorido (verde/âmbar/vermelho) para cada categoria.
- Cálculo baseado em Coeficiente de Variação (CV) dos trimestres e magnitude das variações %LY.
- Score numérico (0-100) com barra de progresso no tooltip.
- Resumo no header: "3 baixa conf. · 3 média conf. · 13 alta conf."
- Tooltip via React Portal com posicionamento inteligente (detecta limites da viewport).
- Razões detalhadas do cálculo e recomendação de revisão manual para categorias de baixa confiança.

### Técnico
- Componente `ConfidenceBadge` com `createPortal` para renderizar tooltip fora da hierarquia da tabela.
- Função `calculateConfidence()` retorna `ConfidenceResult` com level, score, reasons, cv e maxVar.
- Classificação: Alta (CV < 15%, variações < 100%), Média (CV 15-40% ou variações 100-200%), Baixa (CV > 40%, dados nulos ou variações > 200%).

---

## [v1.4] — 2026-02-09

### Adicionado
- **Modal de confirmação** antes de salvar ajustes inline na tabela comparativa.
- Exibição de impacto estimado: valor original, novo valor, delta absoluto, variação percentual.
- Contagem de SKUs afetados na categoria (via `catN4SkuCounts` do ForecastContext).
- Impacto estimado no trimestre (projeção do ajuste mensal × 3 meses).
- Alerta visual (ícone + fundo amarelo) para variações acima de 20%.
- Botões "Confirmar Ajuste" e "Cancelar" com atalhos de teclado.

### Corrigido
- Delay de 200ms no listener de Enter do modal para evitar que o Enter do input feche o modal imediatamente.
- Flag `isProcessingRef` para evitar chamadas duplas (Enter + onBlur simultâneos).

---

## [v1.3] — 2026-02-09

### Adicionado
- **Edição inline** nas células de Qtd (Mês 0, 1 e 2) da tabela comparativa.
- Clicar na célula ativa modo de edição com input numérico.
- Enter ou blur salva o ajuste via `ForecastContext.saveAdjustments()`.
- Propagação proporcional automática para todos os SKUs da categoria.
- Feedback visual: fundo verde, indicador de ponto, delta percentual e tooltip detalhado.
- Registro automático no log de auditoria com status "Pendente".

### Técnico
- Componente `EditableQtdCell` com estados: idle, editing, saved.
- Função `handleInlineEdit()` calcula percentual de ajuste e chama `saveAdjustments()`.
- Mapeamento de meses: `{ "Fev/26": "Mês 0", "Mar/26": "Mês 1", "Abr/26": "Mês 2" }`.

---

## [v1.2] — 2026-02-09

### Adicionado
- **Filtros multi-seleção** em todos os 5 dropdowns (Categoria N3, N4, CD, Comprador, Fornecedor).
- Componente reutilizável `MultiSelectCombobox` com:
  - Checkboxes individuais para cada opção
  - Campo de busca por digitação (case-insensitive) com destaque do texto buscado
  - Botões "Selecionar todos" e "Desmarcar todos"
  - Badges com contagem de selecionados e botão X para remoção individual
  - Navegação por teclado (setas + Enter + Escape)

### Alterado
- `FilterContext` atualizado: todos os filtros agora são `string[]` em vez de `string`.
- `Filters.tsx` reescrito para usar `MultiSelectCombobox` em vez de `FilterCombobox`.
- `ExportButtons.tsx`, `SalesChart.tsx`, `ComparisonTable.tsx` atualizados para tratar filtros como arrays.

---

## [v1.1] — 2026-02-09

### Adicionado
- Coluna **"Penúltimo"** na seção Trimestre da tabela comparativa (dados Ago-Out/2025).
- Coluna **"%Penúlt."** entre %LY e %Últ, mostrando variação vs. penúltimo trimestre.

### Alterado
- Coluna "Anterior" renomeada para **"Ano Anterior"** na seção Trimestre.

### Corrigido
- Erro de DOM: `<button>` aninhado dentro de `<button>` no componente `AuditLog.tsx`. Convertido para `<div>` com `role="button"`.

---

## [v1.0] — 2026-02-08

### Adicionado — Dashboard Principal
- **4 KPI Cards** animados: Venda mês atual, Previsão próximo mês, Trimestre atual, Ajustes realizados.
- **Gráfico de linha interativo** (Recharts): Histórico Jan/2023 a Jan/2026 + Previsão Fev/2026 a Dez/2026 com 4 séries (Venda Regular, Qtd Bruta, Previsão Original, Previsão Ajustada).
- **Tabela comparativa** por Categoria Nível 4: 19 categorias com variações mensais (%LY, %LM) e trimestrais (%LY, %Últ).
- **Tabela de produtos**: 881 produtos com busca textual, paginação (20/página), ordenação por coluna.

### Adicionado — Sistema de Filtros
- 6 filtros: Código Produto, Categoria N3, Categoria N4, CD, Comprador, Fornecedor.
- Combobox/Autocomplete com busca por digitação, destaque amarelo, contagem de resultados.
- 57 fornecedores reais extraídos do Excel.
- Cálculo proporcional quando filtrado por fornecedor.

### Adicionado — Ajustes Colaborativos
- Ajuste por percentual (+/- %) por Categoria Nível 4.
- Persistência via LocalStorage.
- Log de auditoria com timestamp, usuário, item, valores antes/depois.
- Reversão de ajustes com um clique.

### Adicionado — Exportação
- **Excel (.xlsx)**: 4 abas (Resumo, Dados Mensais, Comparativo Categorias, Produtos).
- **PDF**: Relatório visual com KPIs, captura do gráfico (SVG → Canvas → PNG), tabela comparativa.
- Nome do arquivo inclui filtro ativo, data e hora.

### Adicionado — Infraestrutura
- Seletor de período configurável (Fev/2026 a Dez/2026).
- Header com informações do comprador e período.
- Hero banner com imagem gerada por IA.
- Design system "Clean Pharma Analytics" com tipografia DM Sans + JetBrains Mono.
- Animações de entrada com Framer Motion.
- Error Boundary para tratamento de erros React.

### Técnico
- Dados extraídos do Excel `ETAPA_3_PREVISAO_SKU.xlsx` via script Python.
- 881 produtos, 57 fornecedores, 28 categorias, 9 CDs.
- Histórico mensal Jan/2023 a Jan/2026 + Forecast Fev/2026 a Jan/2028.
- Dados mensais por Categoria N4 × CD (histórico e forecast).
