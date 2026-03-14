/*
  Export PDF — Gera relatório PDF com KPIs, gráfico e tabela comparativa
  
  Usa jsPDF + jspdf-autotable para gerar o PDF programaticamente
  e html2canvas para capturar o gráfico como imagem.
  
  Nota: Recharts usa SVG internamente. Para captura confiável,
  clonamos o elemento do gráfico e forçamos renderização inline
  antes de capturar com html2canvas.
*/
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import type { FilteredMonthlyPoint } from "@/contexts/FilterContext";
import type { ComparisonRow } from "@/types/domain";
import { getExportFilename } from "@/lib/exportUtils";

interface ExportPdfParams {
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
  // Metadata
  periodo: string;
  comprador: string;
  dataExportacao: string;
  // Chart element ID for screenshot
  chartElementId?: string;
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Math.round(n).toLocaleString("pt-BR");
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/**
 * Captura o gráfico Recharts como imagem PNG.
 * Estratégia: clona o SVG, limpa rótulos do eixo X para evitar sobreposição,
 * e renderiza em canvas com alta resolução.
 */
async function captureChart(elementId: string): Promise<string | null> {
  const chartEl = document.getElementById(elementId);
  if (!chartEl) return null;

  try {
    const svgElement = chartEl.querySelector("svg.recharts-surface");
    if (!svgElement) return null;

    // Clone the SVG to modify without affecting the DOM
    const svgClone = svgElement.cloneNode(true) as SVGElement;

    // Fix X-axis labels: keep only every 6th label to avoid overlap in PDF
    const xAxisTicks = svgClone.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick");
    xAxisTicks.forEach((tick, index) => {
      if (index % 6 !== 0) {
        // Hide intermediate labels
        (tick as SVGElement).style.display = "none";
      } else {
        // Rotate visible labels for better readability
        const textEl = tick.querySelector("text");
        if (textEl) {
          const x = textEl.getAttribute("x") || "0";
          const y = textEl.getAttribute("y") || "0";
          textEl.setAttribute("transform", `rotate(-30, ${x}, ${y})`);
          textEl.setAttribute("text-anchor", "end");
          textEl.setAttribute("font-size", "11");
        }
      }
    });

    // Ensure all Y-axis labels are visible and properly sized
    const yAxisTicks = svgClone.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick text");
    yAxisTicks.forEach((textEl) => {
      (textEl as SVGElement).setAttribute("font-size", "11");
    });

    // Set explicit width/height on the cloned SVG
    const w = svgElement.clientWidth || 1175;
    const h = svgElement.clientHeight || 320;
    svgClone.setAttribute("width", String(w));
    svgClone.setAttribute("height", String(h));
    svgClone.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // Serialize and render
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = "anonymous";

    const imgLoaded = new Promise<string>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 3; // High DPI for crisp output
        canvas.width = w * scale;
        canvas.height = h * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) { reject("No canvas context"); return; }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, w, h);

        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject("SVG image load failed");
      };
    });

    img.src = url;
    return await imgLoaded;
  } catch (err) {
    // Chart capture failed silently — PDF will be generated without chart image
    return null;
  }
}

export async function exportToPdf(params: ExportPdfParams) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // ── Header ──
  doc.setFillColor(15, 76, 117); // #0F4C75
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Previsão de Vendas Colaborativa — Relatório", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Exportado em ${params.dataExportacao} · Período: ${params.periodo} · Comprador: ${params.comprador}`, margin, 19);

  y = 30;

  // ── Filtros Ativos ──
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  const filtroKeys = Object.keys(params.filtrosAtivos);
  if (filtroKeys.length > 0) {
    const filtroText = filtroKeys.map(k => `${k}: ${params.filtrosAtivos[k]}`).join("  |  ");
    doc.text(`Filtros: ${filtroText}`, margin, y);
    y += 6;
  }

  // ── KPIs ──
  doc.setTextColor(15, 76, 117);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores-Chave", margin, y);
  y += 6;

  const kpiBoxWidth = (pageWidth - margin * 2 - 12) / 4;
  const kpiBoxHeight = 18;
  const kpis = [
    { label: "Venda Mês Atual", value: fmtNum(params.vendaMesAtual), var: fmtPct(params.vendaMesAtualVar) },
    { label: "Previsão Próx. Mês", value: fmtNum(params.previsaoProxMes), var: fmtPct(params.previsaoProxMesVar) },
    { label: "Trimestre Atual", value: fmtNum(params.trimestreAtual), var: "" },
    { label: "Ajustes Realizados", value: params.ajustesRealizados, var: "" },
  ];

  kpis.forEach((kpi, i) => {
    const x = margin + i * (kpiBoxWidth + 4);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, y, kpiBoxWidth, kpiBoxHeight, 2, 2, "F");
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, x + 4, y + 6);
    
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, x + 4, y + 13);
    
    if (kpi.var) {
      const isPositive = kpi.var.startsWith("+");
      doc.setTextColor(isPositive ? 22 : 220, isPositive ? 163 : 38, isPositive ? 74 : 38);
      doc.setFontSize(8);
      doc.text(kpi.var, x + kpiBoxWidth - 4, y + 6, { align: "right" });
    }
  });

  y += kpiBoxHeight + 8;

  // ── Gráfico (captura do DOM) ──
  if (params.chartElementId) {
    const imgData = await captureChart(params.chartElementId);
    if (imgData) {
      // Calculate dimensions to fit nicely
      const chartEl = document.getElementById(params.chartElementId);
      const aspectRatio = chartEl ? chartEl.offsetHeight / chartEl.offsetWidth : 0.45;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = imgWidth * aspectRatio;
      const maxChartHeight = 85; // Max height in mm
      const finalHeight = Math.min(imgHeight, maxChartHeight);

      // Check if chart fits on current page
      if (y + finalHeight + 8 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setTextColor(15, 76, 117);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Histórico de Vendas e Previsão", margin, y);
      y += 5;

      doc.addImage(imgData, "PNG", margin, y, imgWidth, finalHeight);
      y += finalHeight + 8;
    }
  }

  // ── Tabela Comparativa ──
  // Check if we need a new page
  if (y > pageHeight - 60) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(15, 76, 117);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Comparativo Mensal por Categoria Nível 4", margin, y);
  y += 5;

  const tableHead = [
    ["Categoria", "Mês Atual", "Var LY", "Var LM", "Próx Mês", "Var LY", "Mês +2", "Var LY", "Mês +3", "Var LY", "Tri Ant.", "Últ Tri", "Tri Atual", "Var Tri LY", "Var Tri Últ"],
  ];
  const tableBody = params.comparisonData.map(r => [
    r.categoria,
    fmtNum(r.mes0),
    fmtPct(r.varLY),
    fmtPct(r.varLM),
    fmtNum(r.mes1),
    fmtPct(r.varLY1),
    fmtNum(r.mes2),
    fmtPct(r.varLY2),
    fmtNum(r.mes3),
    fmtPct(r.varLY3),
    fmtNum(r.triAnterior),
    fmtNum(r.ultTrimestre),
    fmtNum(r.triAtual),
    fmtPct(r.varTriLY),
    fmtPct(r.varTriUltTri),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 76, 117],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 38 },
    },
  });

  // ── Dados Mensais (nova página) ──
  doc.addPage();
  y = margin;

  doc.setTextColor(15, 76, 117);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Dados Mensais — Histórico e Previsão", margin, y);
  y += 5;

  const monthlyHead = [["Mês", "Venda Regular (un.)", "Qtd Bruta (un.)", "Previsão Original (un.)", "Previsão Ajustada (un.)"]];
  const monthlyBody = params.monthlyData
    .filter(d => d.historico !== null || d.previsao !== null)
    .map(d => [
      d.month,
      fmtNum(d.historico),
      fmtNum(d.qtdBruta),
      fmtNum(d.previsao),
      fmtNum(d.previsaoAjustada),
    ]);

  autoTable(doc, {
    startY: y,
    head: monthlyHead,
    body: monthlyBody,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 76, 117],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // ── Footer em todas as páginas ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.text(
      `Previsão de Vendas Colaborativa · Página ${i}/${totalPages} · Gerado em ${params.dataExportacao}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }

  // ── Salvar ──
  doc.save(getExportFilename("pdf", params.filtrosAtivos));
}
