/**
 * API Type Contracts
 *
 * Define os contratos TypeScript para os endpoints futuros da API.
 * Quando a migração para API acontecer, estes tipos garantem
 * consistência entre cliente e servidor.
 */
import type { Product, SavedAdjustment, AdjustmentLevel, AdjustmentType, ComparisonRow } from "@/types/domain";
import type { FilterState, FilteredMonthlyPoint } from "@/store/filterStore";

// ============================================================
// Products
// ============================================================

/** GET /api/products */
export interface ProductsResponse {
  products: Product[];
  total: number;
}

/** GET /api/products?filters=... (with filter params) */
export interface ProductsRequest {
  filters?: FilterState;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}

// ============================================================
// Forecast Data
// ============================================================

export interface DataBoundaries {
  firstHistoricalNumeric: string;
  lastHistoricalNumeric: string;
  lastHistoricalMonth: string;
  firstForecastMonth: string;
  historicalMonths: string[];
  forecastMonths: string[];
  allMonths: string[];
  allForecastMonthsInData: string[];
}

/** GET /api/forecast/monthly */
export interface MonthlyDataResponse {
  data: FilteredMonthlyPoint[];
  boundaries: DataBoundaries;
}

/** GET /api/forecast/categories */
export interface CategoryForecastResponse {
  /** catN4 -> cd -> month -> value */
  forecast: Record<string, Record<string, Record<string, number>>>;
  /** catN4 -> cd (as number) -> month (YYYY_MM) -> value */
  historico: Record<string, Record<number, Record<string, number>>>;
  /** catN4 -> cd (as number) -> month (YYYY_MM) -> value */
  qtdBruta: Record<string, Record<number, Record<string, number>>>;
}

/** GET /api/forecast/comparison */
export interface ComparisonResponse {
  data: ComparisonRow[];
}

// ============================================================
// Adjustments
// ============================================================

/** POST /api/adjustments */
export interface SaveAdjustmentRequest {
  adjustments: SavedAdjustment[];
}

export interface SaveAdjustmentResponse {
  success: boolean;
  ids: string[];
  timestamp: string;
}

/** GET /api/adjustments */
export interface AdjustmentsResponse {
  adjustments: SavedAdjustment[];
  pendingCount: number;
  exportedCount: number;
}

/** DELETE /api/adjustments/:id */
export interface DeleteAdjustmentResponse {
  success: boolean;
}

/** POST /api/adjustments/export */
export interface ExportRequest {
  format: "json" | "excel" | "pdf";
}

export interface ExportResponse {
  json: string;
  exportedIds: string[];
}

// ============================================================
// Filters
// ============================================================

/** GET /api/filters/options */
export interface FilterOptionsResponse {
  categoriasN3: string[];
  categoriasN4: string[];
  compradores: string[];
  fornecedores: string[];
  centrosDistribuicao: string[];
  produtos: Array<{ codigo: number; nome: string }>;
}

// ============================================================
// Common
// ============================================================

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export type { Product, SavedAdjustment, AdjustmentLevel, AdjustmentType, FilterState, FilteredMonthlyPoint, ComparisonRow };
