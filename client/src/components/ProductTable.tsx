/*
  ProductTable Component — Clean Pharma Analytics
  Tabela de produtos com código, nome, categoria, comprador, CD e forecast
  - Altura fixa para 15 linhas com scroll vertical
  - Conectada ao FilterContext para filtragem
  - Responde ao PeriodContext: originalForecast e forecast somam apenas os activeMonths
  - Usa getMonthlyAdjustmentRatio do ForecastContext para ajuste proporcional
*/
import { Package, ArrowUpDown, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "use-debounce";
import { useFilters } from "@/contexts/FilterContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useForecast } from "@/contexts/ForecastContext";
import { useShallow } from "zustand/react/shallow";
import { catN4CdMonthlyForecast, allProducts as allProductsRaw } from "@/lib/mockData";

type SortField = "codigo" | "nome" | "categoria3" | "categoria4" | "comprador" | "cd" | "originalForecast" | "forecast";
type SortDir = "asc" | "desc";

function formatVal(val: number): string {
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// Pre-compute: total originalForecast per (categoria4, cd) for proportional weight
const _catCdTotals: Record<string, number> = {};
for (const p of allProductsRaw) {
  const key = `${p.categoria4}|${p.cd}`;
  _catCdTotals[key] = (_catCdTotals[key] || 0) + p.originalForecast;
}

export default function ProductTable() {
  const { filteredProducts, isFiltered } = useFilters(useShallow(state => ({
    filteredProducts: state.filteredProducts,
    isFiltered: state.isFiltered
  })));
  const { activeMonths } = usePeriod();
  const { getMonthlyAdjustmentRatio, monthlyAdjustmentMap } = useForecast(useShallow(state => ({
    getMonthlyAdjustmentRatio: state.getMonthlyAdjustmentRatio,
    monthlyAdjustmentMap: state.monthlyAdjustmentMap,
  })));
  const [sortField, setSortField] = useState<SortField>("forecast");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }, [sortField]);

  // Compute period-aware forecasts for each product
  // Pre-compute catCd monthly sums and ratios to avoid redundant lookups
  const productsWithPeriod = useMemo(() => {
    // Pre-compute monthly forecast sums per catCd group (avoids repeated catN4CdMonthlyForecast lookups)
    const catCdMonthCache = new Map<string, number>();
    const getCatCdMonth = (cat4: string, cd: string, month: string) => {
      const cacheKey = `${cat4}|${cd}|${month}`;
      let val = catCdMonthCache.get(cacheKey);
      if (val === undefined) {
        val = catN4CdMonthlyForecast[cat4]?.[cd]?.[month] || 0;
        catCdMonthCache.set(cacheKey, val);
      }
      return val;
    };

    // Pre-compute weight per catCd group (shared across products in same group)
    const weightCache = new Map<string, number>();
    const getWeight = (cat4: string, cd: string, originalForecast: number) => {
      const key = `${cat4}|${cd}`;
      const totalForCatCd = _catCdTotals[key] || 1;
      return originalForecast / totalForCatCd;
    };

    return filteredProducts.map(product => {
      const weight = getWeight(product.categoria4, product.cd, product.originalForecast);

      let periodOriginal = 0;
      let periodAdjusted = 0;

      for (const month of activeMonths) {
        const catCdMonthForecast = getCatCdMonth(product.categoria4, product.cd, month);
        const productMonthForecast = catCdMonthForecast * weight;
        const ratio = getMonthlyAdjustmentRatio(product.categoria4, product.cd, month);

        periodOriginal += productMonthForecast;
        periodAdjusted += productMonthForecast * ratio;
      }

      return {
        ...product,
        originalForecast: Math.round(periodOriginal),
        forecast: Math.round(periodAdjusted),
      };
    });
  }, [filteredProducts, activeMonths, monthlyAdjustmentMap]);

  const searchedProducts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return productsWithPeriod;
    const query = debouncedSearchQuery.toLowerCase();
    return productsWithPeriod.filter(p =>
      p.codigo.toString().includes(query) ||
      p.nome.toLowerCase().includes(query) ||
      p.categoria3.toLowerCase().includes(query) ||
      p.categoria4.toLowerCase().includes(query)
    );
  }, [productsWithPeriod, debouncedSearchQuery]);

  const sortedProducts = useMemo(() => {
    return [...searchedProducts].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [searchedProducts, sortField, sortDir]);

  // Set up virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: sortedProducts.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

  const renderSortHeader = useCallback((field: SortField, label: string, align = "left") => (
    <th
      key={field}
      className={`px-3 py-2 cursor-pointer hover:bg-[#0F4C75]/5 transition-colors select-none ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(field)}
    >
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-2.5 h-2.5 ${sortField === field ? "text-[#0F4C75]" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  ), [toggleSort, sortField]);

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0F4C75]/10">
              <Package className="w-4 h-4 text-[#0F4C75]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Detalhamento por Produto</h2>
              <p className="text-[11px] text-muted-foreground">
                {sortedProducts.length} produto(s) · Previsão total: {formatVal(sortedProducts.reduce((s, p) => s + p.forecast, 0))} un.
                {isFiltered && <span className="text-[#0F4C75] font-semibold ml-1">(filtrado)</span>}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por código, nome ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/20 focus:border-[#0F4C75] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Table with fixed height for ~15 rows */}
        <div className="overflow-x-auto custom-scrollbar">
          <div
            ref={tableContainerRef}
            className="max-h-[540px] overflow-y-auto custom-scrollbar"
          >
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-20 bg-[#F8FAFC]">
                <tr className="border-b-2 border-border">
                  {renderSortHeader("codigo", "Código")}
                  {renderSortHeader("nome", "Nome do Produto")}
                  {renderSortHeader("categoria3", "Cat. Nível 3")}
                  {renderSortHeader("categoria4", "Cat. Nível 4")}
                  {renderSortHeader("comprador", "Comprador")}
                  {renderSortHeader("cd", "CD")}
                  {renderSortHeader("originalForecast", "Previsão Original (un.)", "right")}
                  {renderSortHeader("forecast", "Previsão Ajustada (un.)", "right")}
                </tr>
              </thead>
              <tbody>
                {sortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Nenhum produto encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  <>
                    {paddingTop > 0 && (
                      <tr><td style={{ height: `${paddingTop}px` }} colSpan={8} /></tr>
                    )}
                    {virtualItems.map((virtualRow) => {
                      const product = sortedProducts[virtualRow.index];
                      const diff = product.forecast - product.originalForecast;
                      const pct = product.originalForecast > 0 ? (diff / product.originalForecast) * 100 : 0;
                      const hasAdjustment = diff !== 0;
                      const hasLargeVariation = Math.abs(pct) > 20;
                      const isIncrease = diff > 0;

                      return (
                        <tr
                          key={`${product.codigo}-${product.cd}`}
                          className={`border-b border-border/50 hover:bg-[#0F4C75]/[0.02] transition-colors ${hasAdjustment
                            ? isIncrease
                              ? "bg-emerald-50/50"
                              : "bg-red-50/50"
                            : virtualRow.index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/50"
                            }`}
                        >
                          <td className="px-3 py-2 font-mono font-semibold text-[#0F4C75] tabular-nums whitespace-nowrap">
                            {product.codigo}
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap max-w-[300px] truncate" title={product.nome}>
                            {product.nome}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {product.categoria3}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0F4C75]/8 text-[#0F4C75]">
                              {product.categoria4}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {product.comprador}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {product.cd}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {formatVal(product.originalForecast)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasAdjustment && (
                                isIncrease ? (
                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                )
                              )}
                              <span className={hasAdjustment ? (isIncrease ? "text-emerald-700" : "text-red-700") : "text-foreground"}>
                                {formatVal(product.forecast)}
                              </span>
                              {hasAdjustment && (
                                <span className={`text-[9px] font-bold ${isIncrease ? "text-emerald-600" : "text-red-600"
                                  }`}>
                                  ({isIncrease ? "+" : ""}{pct.toFixed(0)}%)
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paddingBottom > 0 && (
                      <tr><td style={{ height: `${paddingBottom}px` }} colSpan={8} /></tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
