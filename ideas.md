# Brainstorm de Design — Previsão de Vendas Colaborativa

## Contexto
Site corporativo para equipes comerciais de uma empresa varejista farmacêutica. O foco é produtividade, clareza de dados e colaboração. O público-alvo são compradores e gerentes comerciais que precisam visualizar e ajustar previsões de vendas de forma rápida e precisa.

---

<response>
## Ideia 1 — "Pharma Command Center" (Estética de Controle Industrial Moderno)

<text>

**Design Movement:** Industrial Dashboard / Mission Control — inspirado em centros de controle de operações, com foco em densidade de informação e hierarquia visual clara.

**Core Principles:**
1. Densidade informacional controlada — muitos dados visíveis sem poluição visual
2. Hierarquia por contraste cromático — áreas de ação se destacam do fundo neutro
3. Navegação por contexto — filtros sempre visíveis, feedback imediato
4. Profissionalismo farmacêutico — tons que remetem à confiança e precisão

**Color Philosophy:** Base escura (slate-900/950) com acentos em verde-esmeralda (#10B981) para dados positivos e coral (#F97316) para alertas. O fundo escuro reduz fadiga visual em longas sessões de trabalho. Cards e tabelas em slate-800 com bordas sutis em slate-700.

**Layout Paradigm:** Layout em "L invertido" — sidebar fixa à esquerda com filtros e navegação, header compacto com informações do usuário e período selecionado. Área principal dividida em zonas: gráfico ocupa 60% superior, tabelas empilhadas abaixo com scroll independente.

**Signature Elements:**
1. Indicadores de status com "pulse" sutil em dados que foram recentemente editados
2. Linhas de grade pontilhadas no gráfico que se estendem sutilmente para fora do chart area
3. Badges de comprador com iniciais coloridas ao lado de cada edição

**Interaction Philosophy:** Hover revela detalhes contextuais (tooltips ricos). Cliques em células da tabela ativam edição inline com transição suave. Filtros aplicam mudanças com animação de "morph" nos dados.

**Animation:** Transições de 200-300ms com easing cubic-bezier. Gráfico anima entrada de dados da esquerda para direita. Tabelas fazem fade-in por linha com delay escalonado de 30ms. Números que mudam fazem "count up" animado.

**Typography System:** 
- Display: "DM Sans" Bold para títulos e KPIs grandes
- Body: "DM Sans" Regular/Medium para texto geral e tabelas
- Mono: "JetBrains Mono" para valores numéricos na tabela (alinhamento perfeito)

</text>
<probability>0.08</probability>
</response>

---

<response>
## Ideia 2 — "Clean Pharma Analytics" (Estética Corporativa Nórdica)

<text>

**Design Movement:** Scandinavian Corporate / Clean Analytics — inspirado em dashboards de empresas nórdicas de saúde, com foco em clareza, espaço branco e tipografia forte.

**Core Principles:**
1. Clareza acima de tudo — cada elemento tem propósito claro
2. Whitespace como elemento de design — respiro visual entre seções
3. Tipografia como hierarquia — tamanhos e pesos definem importância
4. Cores funcionais — cor só aparece onde transmite significado

**Color Philosophy:** Base branca (#FAFBFC) com superfícies em cinza muito claro (#F1F5F9). Cor primária em azul-petróleo profundo (#0F4C75) para elementos de navegação e ações. Verde (#059669) para variações positivas, vermelho (#DC2626) para negativas. Amarelo âmbar (#D97706) para itens em edição/pendentes. A paleta transmite seriedade e confiança.

**Layout Paradigm:** Layout vertical em "newspaper" — conteúdo flui de cima para baixo em uma coluna principal larga. Filtros em barra horizontal colapsável no topo. Gráfico em card com bordas arredondadas suaves. Tabela comparativa em grid de cards menores. Tabela de ajustes ocupa largura total com sticky header.

**Signature Elements:**
1. Linha divisória sutil com gradiente que vai de transparente a azul-petróleo e volta
2. Cards com sombra muito suave (shadow-sm) e borda de 1px em cinza claro
3. Indicadores de variação com setas e cores (verde/vermelho) em badges arredondados

**Interaction Philosophy:** Minimalista e previsível. Hover em linhas da tabela destaca com background sutil. Edição abre um campo de input limpo com borda azul. Salvamento mostra toast discreto no canto.

**Animation:** Transições curtas de 150-200ms. Fade-in suave para conteúdo carregado. Sem animações chamativas — o foco é na eficiência. Gráfico faz draw-in da linha em 600ms na primeira carga.

**Typography System:**
- Display: "Plus Jakarta Sans" Bold/ExtraBold para títulos
- Body: "Plus Jakarta Sans" Regular/Medium para corpo
- Tabela: "Plus Jakarta Sans" com font-feature-settings: "tnum" para números tabulares

</text>
<probability>0.06</probability>
</response>

---

<response>
## Ideia 3 — "Precision Grid" (Estética de Engenharia de Dados)

<text>

**Design Movement:** Data Engineering / Bloomberg Terminal Lite — inspirado em terminais financeiros modernizados, com foco em máxima eficiência de espaço e leitura rápida de números.

**Core Principles:**
1. Dados são protagonistas — interface serve os números, não o contrário
2. Grid rígido — alinhamento perfeito em 8px grid system
3. Código de cores semântico — cada cor tem significado fixo e aprendível
4. Zero decoração — nenhum elemento existe sem função

**Color Philosophy:** Fundo em off-white quente (#F8F7F4) com cards em branco puro. Sidebar em azul-marinho escuro (#1E293B). Acentos em índigo (#4F46E5) para ações primárias. Sistema de cores para dados: azul (#3B82F6) para histórico, laranja (#F59E0B) para previsão, verde (#22C55E) para ajustes positivos, vermelho (#EF4444) para negativos. Cinza (#94A3B8) para dados inativos.

**Layout Paradigm:** Layout em "cockpit" — barra lateral estreita com ícones de navegação, barra superior com filtros em chips selecionáveis. Área principal usa CSS Grid com áreas nomeadas que se reorganizam responsivamente. Gráfico e tabela comparativa lado a lado em telas grandes, empilhados em telas menores.

**Signature Elements:**
1. Micro-sparklines inline nas células da tabela mostrando tendência dos últimos 3 meses
2. Barra de progresso fina no topo indicando % de categorias já ajustadas
3. Dot indicators coloridos ao lado de cada categoria indicando status (editado/pendente/aprovado)

**Interaction Philosophy:** Keyboard-first — Tab navega entre células editáveis, Enter confirma, Escape cancela. Mouse como segunda opção. Double-click para editar. Atalhos de teclado para filtros comuns.

**Animation:** Mínima e funcional. Transições de 100-150ms. Highlight flash em amarelo claro quando um valor é salvo. Skeleton loading para dados em carregamento. Sem animações de entrada — dados aparecem instantaneamente.

**Typography System:**
- Display: "Space Grotesk" Bold para títulos e headers
- Body: "Space Grotesk" Regular para texto geral
- Dados: "Space Mono" para todos os valores numéricos (monospace perfeito para tabelas)

</text>
<probability>0.07</probability>
</response>
