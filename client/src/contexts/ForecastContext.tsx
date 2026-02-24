/*
  ForecastContext — Estado compartilhado para ajustes de previsão
  
  Gerencia:
  - Ajustes salvos (savedAdjustments) com controle de exportação
  - Ajustes MÊS A MÊS: cada ajuste tem monthlyValues com valor por mês
  - Redistribuição proporcional por SKU
  - Lógica: categoria → redistribui entre SKUs filhos
  - Lógica: SKU → altera apenas aquele produto
  
  CONTROLE DE DUPLICIDADE:
  - Cada ajuste possui flag `exported` e `exportedAt`
  - Ao exportar, apenas ajustes NÃO exportados são incluídos
  - Após exportar, os ajustes são marcados como exported com timestamp
  
  AJUSTES MÊS A MÊS:
  - monthlyValues: Record<string, number> — ex: { "Fev/26": 10, "Mar/26": 5 }
  - type: "%" | "QTD" — se aplica a todos os meses
  - Meses com valor 0 ou ausente não são ajustados
*/
import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { allProducts, catN4CdMonthlyForecast, type Product } from "@/lib/mockData";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";

// ============================================================
// Types
// ============================================================

export type AdjustmentLevel = "CATEGORIA NÍVEL 3" | "CATEGORIA NÍVEL 4" | "PRODUTO";
export type AdjustmentType = "%" | "QTD";

export interface SavedAdjustment {
  id: string;
  level: AdjustmentLevel;
  item: string;
  type: AdjustmentType;
  // Ajustes mês a mês: chave = mês (ex: "Fev/26"), valor = ajuste daquele mês
  monthlyValues: Record<string, number>;
  // Total do período (soma dos ajustes mensais aplicados)
  previsaoOriginal: number;
  previsaoAjustada: number;
  timestamp: string;
  usuario: string;
  // Controle de exportação para evitar duplicidade
  exported: boolean;
  exportedAt: string | null;
}

export interface MonthlyDataPoint {
  month: string;
  historico: number | null;
  qtdBruta: number | null;
  previsao: number | null;
  previsaoAjustada: number | null;
}

// ============================================================
// Category mappings — derived dynamically from allProducts
// ============================================================

// catN3toN4: { "DIABETES": ["DIABETES-INJETAVEL"], ... }
const catN3toN4: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const p of allProducts) {
    if (!map[p.categoria3]) map[p.categoria3] = new Set();
    map[p.categoria3].add(p.categoria4);
  }
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(map)) {
    result[k] = Array.from(v);
  }
  return result;
})();

// catN4SkuCounts: number of unique product codes per categoria4
const catN4SkuCounts: Record<string, number> = (() => {
  const sets: Record<string, Set<number>> = {};
  for (const p of allProducts) {
    if (!sets[p.categoria4]) sets[p.categoria4] = new Set();
    sets[p.categoria4].add(p.codigo);
  }
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(sets)) counts[k] = v.size;
  return counts;
})();

// catN3SkuCounts: number of unique product codes per categoria3
const catN3SkuCounts: Record<string, number> = (() => {
  const sets: Record<string, Set<number>> = {};
  for (const p of allProducts) {
    if (!sets[p.categoria3]) sets[p.categoria3] = new Set();
    sets[p.categoria3].add(p.codigo);
  }
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(sets)) counts[k] = v.size;
  return counts;
})();

// All forecast months — detected dynamically from data
const ALL_FORECAST_MONTHS = DATA_BOUNDARIES.forecastMonths;

// ============================================================
// Helpers — forecast totals
// ============================================================

function getCatN4MonthlyForecast(cat: string, month: string): number {
  const cdData = catN4CdMonthlyForecast[cat];
  if (!cdData) return 0;
  let total = 0;
  for (const cd of Object.keys(cdData)) {
    total += cdData[cd]?.[month] || 0;
  }
  return total;
}

function getCatN4TotalForecast(cat: string, months?: string[]): number {
  const useMonths = months || ALL_FORECAST_MONTHS;
  let total = 0;
  for (const month of useMonths) {
    total += getCatN4MonthlyForecast(cat, month);
  }
  return total;
}

function getCatN3TotalForecast(cat: string, months?: string[]): number {
  const children = catN3toN4[cat] || [];
  return children.reduce((sum, child) => sum + getCatN4TotalForecast(child, months), 0);
}

function getCatN3MonthlyForecast(cat: string, month: string): number {
  const children = catN3toN4[cat] || [];
  return children.reduce((sum, child) => sum + getCatN4MonthlyForecast(child, month), 0);
}

// Pre-compute: for each (categoria4, cd), total originalForecast for proportional weights
const _productCdTotals: Record<string, number> = {};
for (const p of allProducts) {
  const key = `${p.categoria4}|${p.cd}`;
  _productCdTotals[key] = (_productCdTotals[key] || 0) + p.originalForecast;
}

/**
 * CD-aware proportional monthly forecast for a specific product+CD.
 * Uses the product's originalForecast weight within its (cat4, cd) group
 * to distribute the CD-level monthly forecast proportionally.
 */
function getProductMonthlyForecast(codigo: number, cd: string, month: string): number {
  const product = allProducts.find(p => p.codigo === codigo && p.cd === cd);
  if (!product) return 0;

  // Get CD-specific monthly forecast (not the sum across all CDs)
  const cdForecast = catN4CdMonthlyForecast[product.categoria4]?.[cd]?.[month] || 0;

  // Proportional weight: this product's share within (cat4, cd)
  const totalKey = `${product.categoria4}|${cd}`;
  const totalForCatCd = _productCdTotals[totalKey] || 1;
  const weight = product.originalForecast / totalForCatCd;

  return Math.round(cdForecast * weight);
}

/**
 * Summed monthly forecast across ALL CDs for a product code.
 * Used when CD is not available (e.g., getForecastForItem for PRODUTO level).
 */
function getProductMonthlyForecastAllCds(codigo: number, month: string): number {
  const products = allProducts.filter(p => p.codigo === codigo);
  let total = 0;
  for (const p of products) {
    total += getProductMonthlyForecast(p.codigo, p.cd, month);
  }
  return total;
}

function getProductTotalForecast(codigo: number, cd: string, months?: string[]): number {
  const useMonths = months || ALL_FORECAST_MONTHS;
  let total = 0;
  for (const month of useMonths) {
    total += getProductMonthlyForecast(codigo, cd, month);
  }
  return total;
}

function getProductTotalForecastAllCds(codigo: number, months?: string[]): number {
  const useMonths = months || ALL_FORECAST_MONTHS;
  let total = 0;
  for (const month of useMonths) {
    total += getProductMonthlyForecastAllCds(codigo, month);
  }
  return total;
}

// ============================================================
// Context
// ============================================================

interface ForecastContextType {
  savedAdjustments: SavedAdjustment[];
  adjustedProducts: Product[];
  hasAdjustments: boolean;
  totalImpact: number;
  categoriasEditadas: number;
  pendingExportCount: number;
  exportedCount: number;
  saveAdjustments: (adjustments: SavedAdjustment[]) => void;
  clearAdjustments: () => void;
  revertAdjustment: (id: string) => void;
  getForecastForItem: (level: AdjustmentLevel, item: string, months?: string[]) => number;
  getMonthlyForecastForItem: (level: AdjustmentLevel, item: string, month: string) => number;
  getSkuCountForItem: (level: AdjustmentLevel, item: string) => number;
  exportAdjustments: () => { json: string; exportedIds: string[] };
  markAsExported: (ids: string[]) => void;
  catN3toN4: Record<string, string[]>;
  // Monthly adjustment ratios for FilterContext to use
  getMonthlyAdjustmentRatio: (catN4: string, cd: string, month: string) => number;
}

const ForecastContext = createContext<ForecastContextType | null>(null);

export function useForecast() {
  const ctx = useContext(ForecastContext);
  if (!ctx) throw new Error("useForecast must be used within ForecastProvider");
  return ctx;
}

// ============================================================
// Provider
// ============================================================

const STORAGE_KEY = "previsao-vendas-ajustes";

// Migration: ensure old adjustments get new fields
function migrateAdjustments(adjustments: any[]): SavedAdjustment[] {
  return adjustments.map(adj => {
    // Migrate old format (single value) to new format (monthlyValues)
    if (adj.value !== undefined && !adj.monthlyValues) {
      const monthlyValues: Record<string, number> = {};
      for (const m of ALL_FORECAST_MONTHS) {
        monthlyValues[m] = adj.value;
      }
      return {
        ...adj,
        monthlyValues,
        exported: adj.exported ?? false,
        exportedAt: adj.exportedAt ?? null,
      };
    }
    return {
      ...adj,
      exported: adj.exported ?? false,
      exportedAt: adj.exportedAt ?? null,
    };
  });
}

export function ForecastProvider({ children }: { children: ReactNode }) {
  const [savedAdjustments, setSavedAdjustments] = useState<SavedAdjustment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return migrateAdjustments(JSON.parse(stored));
      }
      return [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever adjustments change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAdjustments));
    } catch (e) {
      // localStorage save failed — adjustments will persist only in memory
    }
  }, [savedAdjustments]);

  const getForecastForItem = useCallback((level: AdjustmentLevel, item: string, months?: string[]): number => {
    if (level === "CATEGORIA NÍVEL 3") return getCatN3TotalForecast(item, months);
    if (level === "CATEGORIA NÍVEL 4") return getCatN4TotalForecast(item, months);
    if (level === "PRODUTO") {
      const code = parseInt(item.split(" - ")[0]);
      return getProductTotalForecastAllCds(code, months);
    }
    return 0;
  }, []);

  const getMonthlyForecastForItem = useCallback((level: AdjustmentLevel, item: string, month: string): number => {
    if (level === "CATEGORIA NÍVEL 3") return getCatN3MonthlyForecast(item, month);
    if (level === "CATEGORIA NÍVEL 4") return getCatN4MonthlyForecast(item, month);
    if (level === "PRODUTO") {
      const code = parseInt(item.split(" - ")[0]);
      return getProductMonthlyForecastAllCds(code, month);
    }
    return 0;
  }, []);

  const getSkuCountForItem = useCallback((level: AdjustmentLevel, item: string): number => {
    if (level === "CATEGORIA NÍVEL 3") return catN3SkuCounts[item] || 0;
    if (level === "CATEGORIA NÍVEL 4") return catN4SkuCounts[item] || 0;
    return 1;
  }, []);

  const hasAdjustments = savedAdjustments.length > 0;

  const totalImpact = useMemo(() => {
    return savedAdjustments.reduce((sum, adj) => sum + (adj.previsaoAjustada - adj.previsaoOriginal), 0);
  }, [savedAdjustments]);

  const categoriasEditadas = useMemo(() => {
    return Array.from(new Set(savedAdjustments.map(a => a.item))).length;
  }, [savedAdjustments]);

  const pendingExportCount = useMemo(() => {
    return savedAdjustments.filter(a => !a.exported).length;
  }, [savedAdjustments]);

  const exportedCount = useMemo(() => {
    return savedAdjustments.filter(a => a.exported).length;
  }, [savedAdjustments]);

  const saveAdjustments = useCallback((newAdjustments: SavedAdjustment[]) => {
    const withExportFlag = newAdjustments.map(adj => ({
      ...adj,
      exported: false,
      exportedAt: null,
    }));
    setSavedAdjustments(prev => [...prev, ...withExportFlag]);
  }, []);

  const clearAdjustments = useCallback(() => {
    setSavedAdjustments([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // localStorage clear failed — will be overwritten on next save
    }
  }, []);

  const revertAdjustment = useCallback((id: string) => {
    setSavedAdjustments(prev => prev.filter(adj => adj.id !== id));
  }, []);

  const markAsExported = useCallback((ids: string[]) => {
    const now = new Date().toISOString();
    setSavedAdjustments(prev =>
      prev.map(adj =>
        ids.includes(adj.id)
          ? { ...adj, exported: true, exportedAt: now }
          : adj
      )
    );
  }, []);

  // Pre-compute monthly adjustment multipliers per catN4 per CD per month
  // This is used by FilterContext to compute the green line
  const monthlyAdjustmentMap = useMemo(() => {
    if (savedAdjustments.length === 0) return null;

    // For each catN4 + month, compute the cumulative adjustment multiplier
    // Structure: catN4 → month → multiplier
    const catN4MonthMultiplier: Record<string, Record<string, number>> = {};

    for (const adj of savedAdjustments) {
      if (adj.level === "CATEGORIA NÍVEL 4") {
        if (!catN4MonthMultiplier[adj.item]) catN4MonthMultiplier[adj.item] = {};
        for (const month of ALL_FORECAST_MONTHS) {
          const val = adj.monthlyValues[month] || 0;
          if (val === 0) continue;
          const current = catN4MonthMultiplier[adj.item][month] ?? 1;
          if (adj.type === "%") {
            catN4MonthMultiplier[adj.item][month] = current * (1 + val / 100);
          } else {
            // QTD: need to convert to ratio for this month
            const monthForecast = getCatN4MonthlyForecast(adj.item, month);
            if (monthForecast > 0) {
              const skuCount = catN4SkuCounts[adj.item] || 1;
              catN4MonthMultiplier[adj.item][month] = current + (val / skuCount) / monthForecast * skuCount;
            }
          }
        }
      } else if (adj.level === "CATEGORIA NÍVEL 3") {
        const childCats = catN3toN4[adj.item] || [];
        for (const childCat of childCats) {
          if (!catN4MonthMultiplier[childCat]) catN4MonthMultiplier[childCat] = {};
          for (const month of ALL_FORECAST_MONTHS) {
            const val = adj.monthlyValues[month] || 0;
            if (val === 0) continue;
            const current = catN4MonthMultiplier[childCat][month] ?? 1;
            if (adj.type === "%") {
              catN4MonthMultiplier[childCat][month] = current * (1 + val / 100);
            } else {
              const catN3Total = getCatN3MonthlyForecast(adj.item, month);
              const catN4Total = getCatN4MonthlyForecast(childCat, month);
              const catWeight = catN3Total > 0 ? catN4Total / catN3Total : 1 / childCats.length;
              if (catN4Total > 0) {
                catN4MonthMultiplier[childCat][month] = current + (val * catWeight) / catN4Total;
              }
            }
          }
        }
      }
      // PRODUTO level adjustments are handled separately in adjustedProducts
    }

    return catN4MonthMultiplier;
  }, [savedAdjustments]);

  // Get monthly adjustment ratio for a specific catN4 + CD + month
  const getMonthlyAdjustmentRatio = useCallback((catN4: string, cd: string, month: string): number => {
    if (!monthlyAdjustmentMap) return 1;
    return monthlyAdjustmentMap[catN4]?.[month] ?? 1;
  }, [monthlyAdjustmentMap]);

  /**
   * Calcula o delta mensal de um ajuste sobre um produto específico.
   * Lógica compartilhada entre adjustedProducts e exportAdjustments.
   */
  function calcAdjustmentDeltaForProduct(
    adj: SavedAdjustment,
    product: Product,
    month: string,
    productMonthForecast: number,
  ): number {
    const monthVal = adj.monthlyValues[month] || 0;
    if (monthVal === 0) return 0;

    if (adj.level === "PRODUTO") {
      const adjCode = parseInt(adj.item.split(" - ")[0]);
      if (adjCode !== product.codigo) return 0;
      return adj.type === "%"
        ? Math.round(productMonthForecast * monthVal / 100)
        : monthVal;
    }

    if (adj.level === "CATEGORIA NÍVEL 4" && adj.item === product.categoria4) {
      if (adj.type === "%") {
        return Math.round(productMonthForecast * monthVal / 100);
      }
      const catMonthTotal = getCatN4MonthlyForecast(product.categoria4, month);
      return catMonthTotal > 0
        ? Math.round(monthVal * (productMonthForecast / catMonthTotal))
        : 0;
    }

    if (adj.level === "CATEGORIA NÍVEL 3") {
      const childCats = catN3toN4[adj.item] || [];
      if (!childCats.includes(product.categoria4)) return 0;
      if (adj.type === "%") {
        return Math.round(productMonthForecast * monthVal / 100);
      }
      const catN3MonthTotal = getCatN3MonthlyForecast(adj.item, month);
      const catN4MonthTotal = getCatN4MonthlyForecast(product.categoria4, month);
      const catWeight = catN3MonthTotal > 0 ? catN4MonthTotal / catN3MonthTotal : 1 / childCats.length;
      return catN4MonthTotal > 0
        ? Math.round(monthVal * catWeight * (productMonthForecast / catN4MonthTotal))
        : 0;
    }

    return 0;
  }

  // Calculate adjusted products (apply ALL adjustments to forecast values)
  const adjustedProducts = useMemo((): Product[] => {
    if (savedAdjustments.length === 0) return allProducts;

    return allProducts.map(product => {
      let adjustedForecast = product.originalForecast;

      for (const adj of savedAdjustments) {
        let totalDelta = 0;
        for (const month of ALL_FORECAST_MONTHS) {
          const productMonthForecast = getProductMonthlyForecast(product.codigo, product.cd, month);
          totalDelta += calcAdjustmentDeltaForProduct(adj, product, month, productMonthForecast);
        }
        adjustedForecast += totalDelta;
      }

      return {
        ...product,
        forecast: Math.max(0, Math.round(adjustedForecast)),
      };
    });
  }, [savedAdjustments]);

  // Export ONLY non-exported adjustments to JSON format for datalake
  const exportAdjustments = useCallback(() => {
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
      description: "Apenas ajustes não exportados anteriormente. Cada ajuste contém valores mês a mês.",
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
  }, [savedAdjustments, adjustedProducts]);

  return (
    <ForecastContext.Provider
      value={{
        savedAdjustments,
        adjustedProducts,
        hasAdjustments,
        totalImpact,
        categoriasEditadas,
        pendingExportCount,
        exportedCount,
        saveAdjustments,
        clearAdjustments,
        revertAdjustment,
        getForecastForItem,
        getMonthlyForecastForItem,
        getSkuCountForItem,
        exportAdjustments,
        markAsExported,
        catN3toN4,
        getMonthlyAdjustmentRatio,
      }}
    >
      {children}
    </ForecastContext.Provider>
  );
}
