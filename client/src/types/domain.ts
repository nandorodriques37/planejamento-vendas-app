/**
 * Domain Types
 *
 * Tipos de domínio compartilhados pela aplicação.
 * Independentes da fonte de dados (mock ou API).
 */

export interface Product {
  codigo: number;
  nome: string;
  categoria3: string;
  categoria4: string;
  comprador: string;
  cd: string;
  fornecedor: string;
  forecast: number;
  originalForecast: number;
}

export interface ComparisonRow {
  categoria: string;
  mes0: number | null;
  varLY: number | null;
  varLM: number | null;
  mes1: number | null;
  varLY1: number | null;
  mes2: number | null;
  varLY2: number | null;
  mes3: number | null;
  varLY3: number | null;
  triAnterior: number | null;
  penTrimestre: number | null;
  ultTrimestre: number | null;
  triAtual: number | null;
  varTriLY: number | null;
  varTriPenTri: number | null;
  varTriUltTri: number | null;
}

export type AdjustmentLevel = "CATEGORIA NÍVEL 3" | "CATEGORIA NÍVEL 4" | "PRODUTO";
export type AdjustmentType = "%" | "QTD";

export interface SavedAdjustment {
  id: string;
  level: AdjustmentLevel;
  item: string;
  type: AdjustmentType;
  monthlyValues: Record<string, number>;
  previsaoOriginal: number;
  previsaoAjustada: number;
  timestamp: string;
  usuario: string;
  exported: boolean;
  exportedAt: string | null;
}
