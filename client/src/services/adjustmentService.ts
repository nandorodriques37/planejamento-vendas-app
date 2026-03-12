/**
 * Adjustment Service
 *
 * Abstrai a persistência de ajustes colaborativos.
 * Implementação atual: usa localStorage.
 * Migração para API: substituir por chamadas ao apiClient.
 */
import type { SavedAdjustment } from "@/store/forecastEngine";
import { ALL_FORECAST_MONTHS } from "@/store/forecastEngine";
import type {
  AdjustmentsResponse,
  SaveAdjustmentRequest,
  SaveAdjustmentResponse,
  DeleteAdjustmentResponse,
} from "@/types/api";

const STORAGE_KEY = "previsao-vendas-ajustes";

/**
 * Carrega ajustes salvos.
 * Futuramente: GET /api/adjustments
 */
export async function loadAdjustments(): Promise<AdjustmentsResponse> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const adjustments: SavedAdjustment[] = parsed.map((adj: any) => {
        if (adj.value !== undefined && !adj.monthlyValues) {
          const monthlyValues: Record<string, number> = {};
          for (const m of ALL_FORECAST_MONTHS) monthlyValues[m] = adj.value;
          return { ...adj, monthlyValues, exported: adj.exported ?? false, exportedAt: adj.exportedAt ?? null };
        }
        return { ...adj, exported: adj.exported ?? false, exportedAt: adj.exportedAt ?? null };
      });

      return {
        adjustments,
        pendingCount: adjustments.filter(a => !a.exported).length,
        exportedCount: adjustments.filter(a => a.exported).length,
      };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return { adjustments: [], pendingCount: 0, exportedCount: 0 };
}

/**
 * Salva novos ajustes (append).
 * Futuramente: POST /api/adjustments
 */
export async function saveAdjustments(
  currentAdjustments: SavedAdjustment[],
  newAdjustments: SavedAdjustment[]
): Promise<SaveAdjustmentResponse> {
  const withExportFlag = newAdjustments.map(adj => ({
    ...adj,
    exported: false,
    exportedAt: null,
  }));
  const allAdjustments = [...currentAdjustments, ...withExportFlag];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allAdjustments));

  return {
    success: true,
    ids: withExportFlag.map(a => a.id),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Remove um ajuste pelo ID.
 * Futuramente: DELETE /api/adjustments/:id
 */
export async function deleteAdjustment(
  currentAdjustments: SavedAdjustment[],
  id: string
): Promise<DeleteAdjustmentResponse> {
  const remaining = currentAdjustments.filter(adj => adj.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { success: true };
}

/**
 * Limpa todos os ajustes.
 * Futuramente: DELETE /api/adjustments
 */
export async function clearAllAdjustments(): Promise<DeleteAdjustmentResponse> {
  localStorage.removeItem(STORAGE_KEY);
  return { success: true };
}

/**
 * Marca ajustes como exportados.
 * Futuramente: PATCH /api/adjustments/mark-exported
 */
export async function markAsExported(
  currentAdjustments: SavedAdjustment[],
  ids: string[]
): Promise<SaveAdjustmentResponse> {
  const now = new Date().toISOString();
  const updated = currentAdjustments.map(adj =>
    ids.includes(adj.id) ? { ...adj, exported: true, exportedAt: now } : adj
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return {
    success: true,
    ids,
    timestamp: now,
  };
}

/**
 * Persiste o estado completo dos ajustes (usado internamente).
 * Futuramente: PUT /api/adjustments
 */
export function persistAdjustments(adjustments: SavedAdjustment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(adjustments));
}
