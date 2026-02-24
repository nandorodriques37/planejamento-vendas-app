/**
 * Utilitários compartilhados para exportação (Excel e PDF)
 */

/** Gera prefixo de data/hora para nomes de arquivo: "20260215_0930" */
export function getExportTimestamp(): { dateStr: string; timeStr: string } {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return { dateStr, timeStr };
}

/** Gera nome de arquivo de exportação padronizado */
export function getExportFilename(extension: "xlsx" | "pdf", filtrosAtivos: Record<string, string>): string {
  const { dateStr, timeStr } = getExportTimestamp();
  const filtroLabel = Object.values(filtrosAtivos).filter(Boolean).join("_") || "Geral";
  return `Previsao_Vendas_${filtroLabel}_${dateStr}_${timeStr}.${extension}`;
}
