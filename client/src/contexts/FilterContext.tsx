/*
  FilterContext — Estado compartilhado de filtros para TODOS os componentes
  
  Gerencia:
  - Filtros selecionados (código produto, cat N3, cat N4, CD, comprador, fornecedor)
  - MULTI-SELEÇÃO: cat N3, cat N4, CD, comprador e fornecedor aceitam arrays de valores
  - Dados filtrados de produtos
  - Dados filtrados de categorias para tabela comparativa
  - Dados mensais filtrados para o gráfico (historico + forecast + forecast ajustado)
  
  IMPORTANTE: Quando um filtro é aplicado, TODOS os componentes devem reagir:
  - Gráfico: mostra apenas dados dos CDs/categorias filtrados (TANTO histórico QUANTO forecast)
  - Tabela comparativa: mostra apenas categorias filtradas
  - Tabela de produtos: mostra apenas produtos filtrados
  
  ESTRUTURA DE DADOS:
  - catN4CdMonthlyHistorico: chaves CD = números (1, 2, 3...), meses = "2023_01" format
  - catN4CdMonthlyQtdBruta: chaves CD = números (1, 2, 3...), meses = "2023_01" format
  - catN4CdMonthlyForecast: chaves CD = strings ("CD 1", "CD 2"...), meses = "Jan/23" format
  - products: cd = string "CD 1", "CD 2"...
  
  PREVISÃO AJUSTADA MÊS A MÊS:
  - Usa getMonthlyAdjustmentRatio do ForecastContext
  - Para cada mês de forecast, aplica o ratio de ajuste por catN4
  - Isso permite que ajustes diferentes por mês se reflitam corretamente no gráfico
*/
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import {
  catN4CdMonthlyForecast,
  catN4CdMonthlyHistorico,
  catN4CdMonthlyQtdBruta,
  allProducts as originalProducts,
  type Product,
} from "@/lib/mockData";
import { comparisonData, monthlyData, type ComparisonRow } from "@/lib/dataDerived";
import {
  monthYearToNumeric,
} from "@/lib/dateUtils";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";

export interface FilterState {
  codigoProduto: string;
  categoriaN3: string[];
  categoriaN4: string[];
  centroDistribuicao: string[];
  comprador: string[];
  fornecedor: string[];
}

const emptyFilters: FilterState = {
  codigoProduto: "",
  categoriaN3: [],
  categoriaN4: [],
  centroDistribuicao: [],
  fornecedor: [],
  comprador: [],
};

// Ordered months for the chart — detected dynamically from data boundaries
const historicalMonths = DATA_BOUNDARIES.historicalMonths;
const forecastMonths = DATA_BOUNDARIES.forecastMonths;
const allMonths = DATA_BOUNDARIES.allMonths;

// Helper: convert "Jan/23" → "2023_01" for historico/qtdBruta lookup
function toHistoricoKey(month: string): string {
  return monthYearToNumeric(month);
}

// Helper: extract CD number from "CD 1" → 1
function cdToNumber(cd: string): number {
  return parseInt(cd.replace(/\D/g, ""), 10);
}

export interface FilteredMonthlyPoint {
  month: string;
  historico: number | null;
  qtdBruta: number | null;
  previsao: number | null;
  previsaoAjustada: number | null;
}

// Helper to check if a multi-select filter has any active selections
function hasSelection(arr: string[]): boolean {
  return arr.length > 0;
}

// Helper to check if a value matches a multi-select filter
function matchesFilter(value: string, filter: string[]): boolean {
  return filter.length === 0 || filter.includes(value);
}

interface FilterContextType {
  filters: FilterState;
  appliedFilters: FilterState;
  setFilter: (key: keyof FilterState, value: string | string[]) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  filteredProducts: Product[];
  filteredComparison: ComparisonRow[];
  filteredMonthlyData: FilteredMonthlyPoint[];
  isFiltered: boolean;
  hasAdjustedForecast: boolean;
  activeCds: string[];
  activeCatN4s: string[];
}

const FilterContext = createContext<FilterContextType | null>(null);

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

interface FilterProviderProps {
  children: ReactNode;
  products: Product[];
  // Function to get monthly adjustment ratio from ForecastContext
  getMonthlyAdjustmentRatio?: (catN4: string, cd: string, month: string) => number;
}

export function FilterProvider({ children, products, getMonthlyAdjustmentRatio }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);

  const setFilter = useCallback((key: keyof FilterState, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(prev => {
      setAppliedFilters({ ...prev });
      return prev;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }, []);

  const isFiltered = useMemo(() => {
    return (
      appliedFilters.codigoProduto !== "" ||
      hasSelection(appliedFilters.categoriaN3) ||
      hasSelection(appliedFilters.categoriaN4) ||
      hasSelection(appliedFilters.centroDistribuicao) ||
      hasSelection(appliedFilters.comprador) ||
      hasSelection(appliedFilters.fornecedor)
    );
  }, [appliedFilters]);

  // Filter products based on applied filters
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (appliedFilters.codigoProduto) {
        const search = appliedFilters.codigoProduto.toLowerCase();
        if (!String(p.codigo).includes(search) && !p.nome.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (!matchesFilter(p.categoria3, appliedFilters.categoriaN3)) return false;
      if (!matchesFilter(p.categoria4, appliedFilters.categoriaN4)) return false;
      if (!matchesFilter(p.cd, appliedFilters.centroDistribuicao)) return false;
      if (!matchesFilter(p.comprador, appliedFilters.comprador)) return false;
      if (!matchesFilter(p.fornecedor, appliedFilters.fornecedor)) return false;
      return true;
    });
  }, [appliedFilters, products]);

  // Derive active CDs and Cat N4s from filtered products
  const activeCds = useMemo(() => {
    if (!isFiltered) {
      return Array.from(new Set(products.map(p => p.cd)));
    }
    return Array.from(new Set(filteredProducts.map(p => p.cd)));
  }, [filteredProducts, products, isFiltered]);

  const activeCatN4s = useMemo(() => {
    if (!isFiltered) {
      const allCats = new Set<string>();
      for (const cat of Object.keys(catN4CdMonthlyHistorico)) {
        allCats.add(cat);
      }
      for (const cat of Object.keys(catN4CdMonthlyForecast)) {
        allCats.add(cat);
      }
      return Array.from(allCats);
    }
    return Array.from(new Set(filteredProducts.map(p => p.categoria4)));
  }, [filteredProducts, isFiltered]);

  // Filter comparison data based on applied filters, sorted by mes0 descending
  const filteredComparison = useMemo(() => {
    const data = isFiltered
      ? comparisonData.filter(row => activeCatN4s.includes(row.categoria))
      : [...comparisonData];
    return data.sort((a, b) => (b.mes0 ?? 0) - (a.mes0 ?? 0));
  }, [activeCatN4s, isFiltered]);

  // Check if any product has been adjusted (forecast != originalForecast)
  const hasAdjustedForecast = useMemo(() => {
    return products.some(p => p.forecast !== p.originalForecast);
  }, [products]);

  // Generate filtered monthly data for the chart
  // Now uses getMonthlyAdjustmentRatio for per-month adjustment ratios
  const filteredMonthlyData = useMemo((): FilteredMonthlyPoint[] => {
    const getRatio = getMonthlyAdjustmentRatio || (() => 1);

    // SPECIAL CASE: When filtering by fornecedor (or other product-level filters),
    // we need to sum values directly from filteredProducts instead of using
    // the aggregated catN4CdMonthly structures, because multiple fornecedores
    // can share the same categoria4/CD combination.
    const useProductLevelAggregation = hasSelection(appliedFilters.fornecedor) || appliedFilters.codigoProduto !== "";

    if (useProductLevelAggregation && isFiltered) {
      // When filtering by fornecedor, we need to calculate proportionally
      const cdNumbers = activeCds.map(cd => cdToNumber(cd));
      const cdStrings = activeCds;
      const catArr = activeCatN4s;
      
      // Calculate proportion of filtered products for each cat/CD combo
      const catCdProportions = new Map<string, number>();
      for (const cat of catArr) {
        for (const cd of cdStrings) {
          const totalInCatCd = products.filter(p => p.categoria4 === cat && p.cd === cd).reduce((sum, p) => sum + p.forecast, 0);
          const filteredInCatCd = filteredProducts.filter(p => p.categoria4 === cat && p.cd === cd).reduce((sum, p) => sum + p.forecast, 0);
          const proportion = totalInCatCd > 0 ? filteredInCatCd / totalInCatCd : 0;
          catCdProportions.set(`${cat}|${cd}`, proportion);
        }
      }
      
      return allMonths.map(month => {
        const isHistoricalMonth = historicalMonths.includes(month);
        const isForecastMonth = forecastMonths.includes(month);
        
        let historico = 0;
        let hasHistorico = false;
        if (isHistoricalMonth) {
          const historicoKey = toHistoricoKey(month);
          for (let c = 0; c < catArr.length; c++) {
            for (let d = 0; d < cdNumbers.length; d++) {
              const val = catN4CdMonthlyHistorico[catArr[c]]?.[cdNumbers[d]]?.[historicoKey];
              if (val !== undefined && val !== null) {
                const proportion = catCdProportions.get(`${catArr[c]}|${cdStrings[d]}`) || 0;
                historico += val * proportion;
                hasHistorico = true;
              }
            }
          }
        }
        
        let qtdBruta = 0;
        let hasQtdBruta = false;
        if (isHistoricalMonth) {
          const qtdBrutaKey = toHistoricoKey(month);
          for (let c = 0; c < catArr.length; c++) {
            for (let d = 0; d < cdNumbers.length; d++) {
              const val = catN4CdMonthlyQtdBruta[catArr[c]]?.[cdNumbers[d]]?.[qtdBrutaKey];
              if (val !== undefined && val !== null) {
                const proportion = catCdProportions.get(`${catArr[c]}|${cdStrings[d]}`) || 0;
                qtdBruta += val * proportion;
                hasQtdBruta = true;
              }
            }
          }
        }
        
        let previsao: number | null = null;
        let hasPrevisao = false;
        if (isForecastMonth) {
          for (let c = 0; c < catArr.length; c++) {
            for (let d = 0; d < cdStrings.length; d++) {
              const val = catN4CdMonthlyForecast[catArr[c]]?.[cdStrings[d]]?.[month];
              if (val !== undefined && val !== null) {
                const proportion = catCdProportions.get(`${catArr[c]}|${cdStrings[d]}`) || 0;
                previsao = (previsao || 0) + (val * proportion);
                hasPrevisao = true;
              }
            }
          }
        }
        
        let totalWeightedRatio = 0;
        let totalWeight = 0;
        if (hasPrevisao && previsao !== null && hasAdjustedForecast && isForecastMonth) {
          for (let c = 0; c < catArr.length; c++) {
            for (let d = 0; d < cdStrings.length; d++) {
              const val = catN4CdMonthlyForecast[catArr[c]]?.[cdStrings[d]]?.[month];
              if (val !== undefined && val !== null && val > 0) {
                const ratio = getRatio(catArr[c], cdStrings[d], month);
                totalWeightedRatio += val * ratio;
                totalWeight += val;
              }
            }
          }
        }
        const avgRatio = totalWeight > 0 ? totalWeightedRatio / totalWeight : 1;
        const previsaoAjustada = hasPrevisao && previsao !== null && hasAdjustedForecast
          ? Math.round(previsao * avgRatio)
          : null;
        
        return {
          month,
          historico: isHistoricalMonth && hasHistorico ? Math.round(historico) : null,
          qtdBruta: isHistoricalMonth && hasQtdBruta ? Math.round(qtdBruta) : null,
          previsao: hasPrevisao && previsao !== null ? Math.round(previsao) : null,
          previsaoAjustada,
        };
      });
    }

    if (!isFiltered) {
      // No filter: return original aggregated data + adjusted forecast
      return monthlyData.map(d => {
        let previsaoAjustada: number | null = null;
        
        if (d.previsao !== null && hasAdjustedForecast) {
          let total = 0;
          for (const cat of Object.keys(catN4CdMonthlyForecast)) {
            const cdData = catN4CdMonthlyForecast[cat];
            if (!cdData) continue;
            for (const cd of Object.keys(cdData)) {
              const origVal = cdData[cd]?.[d.month] || 0;
              const ratio = getRatio(cat, cd, d.month);
              total += origVal * ratio;
            }
          }
          previsaoAjustada = Math.round(total);
        }
        
        return {
          month: d.month,
          historico: d.historico,
          qtdBruta: d.qtdBruta,
          previsao: d.previsao,
          previsaoAjustada,
        };
      });
    }

    // Pre-compute CD numbers for historico/qtdBruta lookups
    const cdNumbers = activeCds.map(cd => cdToNumber(cd));
    const catArr = activeCatN4s;

    return allMonths.map(month => {
      const isHistoricalMonth = historicalMonths.includes(month);
      const isForecastMonth = forecastMonths.includes(month);

      let historico = 0;
      let hasHistorico = false;
      if (isHistoricalMonth) {
        const historicoKey = toHistoricoKey(month);
        for (let c = 0; c < catArr.length; c++) {
          for (let d = 0; d < cdNumbers.length; d++) {
            const val = catN4CdMonthlyHistorico[catArr[c]]?.[cdNumbers[d]]?.[historicoKey];
            if (val !== undefined && val !== null) {
              historico += val;
              hasHistorico = true;
            }
          }
        }
      }

      let qtdBruta = 0;
      let hasQtdBruta = false;
      if (isHistoricalMonth) {
        const qtdBrutaKey = toHistoricoKey(month);
        for (let c = 0; c < catArr.length; c++) {
          for (let d = 0; d < cdNumbers.length; d++) {
            const val = catN4CdMonthlyQtdBruta[catArr[c]]?.[cdNumbers[d]]?.[qtdBrutaKey];
            if (val !== undefined && val !== null) {
              qtdBruta += val;
              hasQtdBruta = true;
            }
          }
        }
      }

      let previsao = 0;
      let hasForecast = false;
      if (isForecastMonth) {
        for (let c = 0; c < catArr.length; c++) {
          for (let d = 0; d < activeCds.length; d++) {
            const val = catN4CdMonthlyForecast[catArr[c]]?.[activeCds[d]]?.[month];
            if (val !== undefined && val !== null) {
              previsao += val;
              hasForecast = true;
            }
          }
        }
      }

      let previsaoAjustada: number | null = null;
      if (isForecastMonth && hasForecast && hasAdjustedForecast) {
        let total = 0;
        for (let c = 0; c < catArr.length; c++) {
          for (let d = 0; d < activeCds.length; d++) {
            const origVal = catN4CdMonthlyForecast[catArr[c]]?.[activeCds[d]]?.[month] || 0;
            const ratio = getRatio(catArr[c], activeCds[d], month);
            total += origVal * ratio;
          }
        }
        previsaoAjustada = Math.round(total);
      }

      return {
        month,
        historico: isHistoricalMonth && hasHistorico ? Math.round(historico) : null,
        qtdBruta: isHistoricalMonth && hasQtdBruta ? Math.round(qtdBruta) : null,
        previsao: hasForecast ? Math.round(previsao) : null,
        previsaoAjustada,
      };
    });
  }, [isFiltered, activeCds, activeCatN4s, hasAdjustedForecast, getMonthlyAdjustmentRatio, appliedFilters, filteredProducts, products]);

  return (
    <FilterContext.Provider
      value={{
        filters,
        appliedFilters,
        setFilter,
        applyFilters,
        clearFilters,
        filteredProducts,
        filteredComparison,
        filteredMonthlyData,
        isFiltered,
        hasAdjustedForecast,
        activeCds,
        activeCatN4s,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}
