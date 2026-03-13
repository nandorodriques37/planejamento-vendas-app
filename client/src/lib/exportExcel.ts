/*
  Export Excel — Gera planilha .xlsx com dados filtrados
  
  Abas:
  1. Resumo (KPIs + filtros ativos)
  2. Dados Mensais (histórico + previsão + previsão ajustada)
  3. Comparativo Categorias (tabela comparativa por Cat N4)
  4. Produtos (lista de produtos filtrados)
*/
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { FilteredMonthlyPoint } from "@/contexts/FilterContext";
import type { Product } from "@/types/domain";
import type { ComparisonRow } from "@/types/domain";
import { getExportFilename } from "@/lib/exportUtils";

interface ExportExcelParams {
  // KPIs
  vendaMesAtual: number;
  vendaMesAtualVar: number;
  previsaoProxMes: number;
  previsaoProxMesVar: number;
  trimestreAtual: number;
  ajustesRealizados: string;
  // Filtros ativos
  filtrosAtivos: Record<string, string>;
  // Dados
  monthlyData: FilteredMonthlyPoint[];
  comparisonData: ComparisonRow[];
  products: Product[];
  // Metadata
  periodo: string;
  comprador: string;
  dataExportacao: string;
}

function formatNumber(n: number | null | undefined): number | string {
  if (n === null || n === undefined) return "";
  return Math.round(n);
}

function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function exportToExcel(params: ExportExcelParams) {
  const wb = XLSX.utils.book_new();

  // ── Aba 1: Resumo ──
  const resumoData = [
    ["PREVISÃO DE VENDAS COLABORATIVA — RELATÓRIO"],
    [""],
    ["Data de Exportação", params.dataExportacao],
    ["Período", params.periodo],
    ["Comprador", params.comprador],
    [""],
    ["FILTROS ATIVOS"],
  ];

  const filtroKeys = Object.keys(params.filtrosAtivos);
  if (filtroKeys.length === 0) {
    resumoData.push(["Nenhum filtro aplicado"]);
  } else {
    for (const key of filtroKeys) {
      resumoData.push([key, params.filtrosAtivos[key]]);
    }
  }

  resumoData.push(
    [""],
    ["INDICADORES-CHAVE (KPIs)"],
    ["Venda Mês Atual (un.)", String(params.vendaMesAtual), formatPercent(params.vendaMesAtualVar)],
    ["Previsão Próximo Mês (un.)", String(params.previsaoProxMes), formatPercent(params.previsaoProxMesVar)],
    ["Trimestre Atual (un.)", String(params.trimestreAtual)],
    ["Ajustes Realizados", params.ajustesRealizados],
  );

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  wsResumo["!cols"] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // ── Aba 2: Dados Mensais ──
  const monthlyHeader = ["Mês", "Venda Regular (un.)", "Qtd Bruta (un.)", "Previsão Original (un.)", "Previsão Ajustada (un.)"];
  const monthlyRows = params.monthlyData
    .filter(d => d.historico !== null || d.previsao !== null)
    .map(d => [
      d.month,
      formatNumber(d.historico),
      formatNumber(d.qtdBruta),
      formatNumber(d.previsao),
      formatNumber(d.previsaoAjustada),
    ]);

  const wsMensal = XLSX.utils.aoa_to_sheet([monthlyHeader, ...monthlyRows]);
  wsMensal["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsMensal, "Dados Mensais");

  // ── Aba 3: Comparativo Categorias ──
  const compHeader = [
    "Categoria Nível 4",
    "Mês Atual (un.)",
    "Var. LY (%)",
    "Var. LM (%)",
    "Próx. Mês (un.)",
    "Var. LY Próx (%)",
    "Mês +2 (un.)",
    "Var. LY +2 (%)",
    "Tri Anterior (un.)",
    "Último Tri (un.)",
    "Tri Atual (un.)",
    "Var. Tri LY (%)",
    "Var. Tri Últ (%)",
  ];
  const compRows = params.comparisonData.map(r => [
    r.categoria,
    formatNumber(r.mes0),
    formatPercent(r.varLY),
    formatPercent(r.varLM),
    formatNumber(r.mes1),
    formatPercent(r.varLY1),
    formatNumber(r.mes2),
    formatPercent(r.varLY2),
    formatNumber(r.triAnterior),
    formatNumber(r.ultTrimestre),
    formatNumber(r.triAtual),
    formatPercent(r.varTriLY),
    formatPercent(r.varTriUltTri),
  ]);

  const wsComp = XLSX.utils.aoa_to_sheet([compHeader, ...compRows]);
  wsComp["!cols"] = compHeader.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsComp, "Comparativo Categorias");

  // ── Aba 4: Produtos ──
  const prodHeader = ["Código", "Nome do Produto", "Cat. Nível 3", "Cat. Nível 4", "Fornecedor", "Comprador", "CD", "Previsão Original (un.)", "Previsão Ajustada (un.)"];
  const prodRows = params.products.map(p => [
    p.codigo,
    p.nome,
    p.categoria3,
    p.categoria4,
    p.fornecedor,
    p.comprador,
    p.cd,
    Math.round(p.originalForecast),
    Math.round(p.forecast),
  ]);

  const wsProd = XLSX.utils.aoa_to_sheet([prodHeader, ...prodRows]);
  wsProd["!cols"] = [
    { wch: 10 }, { wch: 40 }, { wch: 20 }, { wch: 25 },
    { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsProd, "Produtos");

  // ── Salvar ──
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  saveAs(blob, getExportFilename("xlsx", params.filtrosAtivos));
}
