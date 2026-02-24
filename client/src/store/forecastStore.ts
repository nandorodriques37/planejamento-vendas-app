import { create } from "zustand";
import { allProducts, catN4CdMonthlyForecast, type Product } from "@/lib/mockData";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";

import {
    type SavedAdjustment, type AdjustmentLevel, type AdjustmentType,
    catN3toN4, getCatN3TotalForecast, getCatN4TotalForecast, getProductTotalForecastAllCds,
    getCatN3MonthlyForecast, getCatN4MonthlyForecast, getProductMonthlyForecastAllCds,
    catN3SkuCounts, catN4SkuCounts, getProductMonthlyForecast, calcAdjustmentDeltaForProduct,
    computeDerivedState, ALL_FORECAST_MONTHS
} from "./forecastEngine";
import ForecastWorker from './forecastWorker?worker';

export type { SavedAdjustment, AdjustmentLevel, AdjustmentType };

export interface MonthlyDataPoint {
    month: string;
    historico: number | null;
    qtdBruta: number | null;
    previsao: number | null;
    previsaoAjustada: number | null;
}


const STORAGE_KEY = "previsao-vendas-ajustes";

function loadAdjustments(): SavedAdjustment[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.map((adj: any) => {
                if (adj.value !== undefined && !adj.monthlyValues) {
                    const monthlyValues: Record<string, number> = {};
                    for (const m of ALL_FORECAST_MONTHS) monthlyValues[m] = adj.value;
                    return { ...adj, monthlyValues, exported: adj.exported ?? false, exportedAt: adj.exportedAt ?? null };
                }
                return { ...adj, exported: adj.exported ?? false, exportedAt: adj.exportedAt ?? null };
            });
        }
    } catch (e) { }
    return [];
}


// --- Zustand Store ---

interface ForecastStoreType {
    savedAdjustments: SavedAdjustment[];
    adjustedProducts: Product[];
    hasAdjustments: boolean;
    totalImpact: number;
    categoriasEditadas: number;
    pendingExportCount: number;
    exportedCount: number;
    monthlyAdjustmentMap: Record<string, Record<string, number>> | null;
    catN3toN4: Record<string, string[]>;
    isCalculating: boolean;

    saveAdjustments: (adjustments: SavedAdjustment[]) => void;
    clearAdjustments: () => void;
    revertAdjustment: (id: string) => void;
    getForecastForItem: (level: AdjustmentLevel, item: string, months?: string[]) => number;
    getMonthlyForecastForItem: (level: AdjustmentLevel, item: string, month: string) => number;
    getSkuCountForItem: (level: AdjustmentLevel, item: string) => number;
    exportAdjustments: () => { json: string; exportedIds: string[] };
    markAsExported: (ids: string[]) => void;
    getMonthlyAdjustmentRatio: (catN4: string, cd: string, month: string) => number;
}

const initialAdjustments = loadAdjustments();
const initialState = computeDerivedState(initialAdjustments);

const worker = new ForecastWorker();

export const useForecastStore = create<ForecastStoreType>()((set, get) => {
    // Listen for Web Worker messages to update derived state
    worker.onmessage = (e) => {
        set({
            isCalculating: false,
            ...e.data
        });
    };

    return {
        savedAdjustments: initialAdjustments,
        ...initialState,
        catN3toN4,
        isCalculating: false,

        saveAdjustments: (newAdjustments) => {
            set((state) => {
                const withExportFlag = newAdjustments.map(adj => ({ ...adj, exported: false, exportedAt: null }));
                const nextAdjustments = [...state.savedAdjustments, ...withExportFlag];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAdjustments));
                worker.postMessage({ savedAdjustments: nextAdjustments });
                return { savedAdjustments: nextAdjustments, isCalculating: true };
            });
        },

        clearAdjustments: () => {
            localStorage.removeItem(STORAGE_KEY);
            worker.postMessage({ savedAdjustments: [] });
            set({ savedAdjustments: [], isCalculating: true });
        },

        revertAdjustment: (id) => {
            set((state) => {
                const nextAdjustments = state.savedAdjustments.filter(adj => adj.id !== id);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAdjustments));
                worker.postMessage({ savedAdjustments: nextAdjustments });
                return { savedAdjustments: nextAdjustments, isCalculating: true };
            });
        },

        markAsExported: (ids) => {
            set((state) => {
                const now = new Date().toISOString();
                const nextAdjustments = state.savedAdjustments.map(adj =>
                    ids.includes(adj.id) ? { ...adj, exported: true, exportedAt: now } : adj
                );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAdjustments));
                worker.postMessage({ savedAdjustments: nextAdjustments });
                return { savedAdjustments: nextAdjustments, isCalculating: true };
            });
        },

        getForecastForItem: (level, item, months) => {
            if (level === "CATEGORIA NÍVEL 3") return getCatN3TotalForecast(item, months);
            if (level === "CATEGORIA NÍVEL 4") return getCatN4TotalForecast(item, months);
            if (level === "PRODUTO") {
                const code = parseInt(item.split(" - ")[0]);
                return getProductTotalForecastAllCds(code, months);
            }
            return 0;
        },

        getMonthlyForecastForItem: (level, item, month) => {
            if (level === "CATEGORIA NÍVEL 3") return getCatN3MonthlyForecast(item, month);
            if (level === "CATEGORIA NÍVEL 4") return getCatN4MonthlyForecast(item, month);
            if (level === "PRODUTO") {
                const code = parseInt(item.split(" - ")[0]);
                return getProductMonthlyForecastAllCds(code, month);
            }
            return 0;
        },

        getSkuCountForItem: (level, item) => {
            if (level === "CATEGORIA NÍVEL 3") return catN3SkuCounts[item] || 0;
            if (level === "CATEGORIA NÍVEL 4") return catN4SkuCounts[item] || 0;
            return 1;
        },

        getMonthlyAdjustmentRatio: (catN4, cd, month) => {
            const { monthlyAdjustmentMap } = get();
            if (!monthlyAdjustmentMap) return 1;
            return monthlyAdjustmentMap[catN4]?.[month] ?? 1;
        },

        exportAdjustments: () => {
            const { savedAdjustments, adjustedProducts } = get();
            const pendingAdjustments = savedAdjustments.filter(a => !a.exported);
            const exportedIds = pendingAdjustments.map(a => a.id);

            const affectedProducts = adjustedProducts.map(p => {
                const forecastPorMes: Record<string, { original: number; ajustado: number; delta: number }> = {};
                for (const month of ALL_FORECAST_MONTHS) {
                    const originalMonthForecast = getProductMonthlyForecast(p.codigo, p.cd, month);
                    let adjustedMonthForecast = originalMonthForecast;
                    for (const adj of savedAdjustments) {
                        adjustedMonthForecast += calcAdjustmentDeltaForProduct(adj, p, month, originalMonthForecast);
                    }
                    forecastPorMes[month] = {
                        original: originalMonthForecast,
                        ajustado: Math.max(0, Math.round(adjustedMonthForecast)),
                        delta: Math.max(0, Math.round(adjustedMonthForecast)) - originalMonthForecast,
                    };
                }
                return {
                    codigo: p.codigo,
                    nome: p.nome,
                    categoria3: p.categoria3,
                    categoria4: p.categoria4,
                    comprador: p.comprador,
                    cd: p.cd,
                    forecastOriginal: p.originalForecast,
                    forecastAjustado: p.forecast,
                    delta: p.forecast - p.originalForecast,
                    forecastPorMes,
                };
            }).filter(p => p.delta !== 0);

            const exportData = {
                exportTimestamp: new Date().toISOString(),
                exportType: "incremental",
                description: "Apenas ajustes não exportados anteriormente.",
                totalNewAdjustments: pendingAdjustments.length,
                totalImpactNewAdjustments: pendingAdjustments.reduce((sum, adj) => sum + (adj.previsaoAjustada - adj.previsaoOriginal), 0),
                previouslyExportedCount: savedAdjustments.filter(a => a.exported).length,
                newAdjustments: pendingAdjustments.map(adj => ({
                    id: adj.id,
                    level: adj.level,
                    item: adj.item,
                    type: adj.type,
                    monthlyValues: adj.monthlyValues,
                    previsaoOriginal: adj.previsaoOriginal,
                    previsaoAjustada: adj.previsaoAjustada,
                    delta: adj.previsaoAjustada - adj.previsaoOriginal,
                    timestamp: adj.timestamp,
                    usuario: adj.usuario,
                })),
                currentAdjustedProducts: affectedProducts,
            };

            return {
                json: JSON.stringify(exportData, null, 2),
                exportedIds,
            };
        }
    };
});
