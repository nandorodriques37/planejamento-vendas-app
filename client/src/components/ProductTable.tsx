/*
  ProductTable Component — Clean Pharma Analytics
  Tabela de produtos com código, nome, categoria, comprador, CD e forecast
  - Altura fixa para 15 linhas com scroll vertical
  - Conectada ao FilterContext para filtragem
  - Responde ao PeriodContext: originalForecast e forecast somam apenas os activeMonths
  - Usa getMonthlyAdjustmentRatio do ForecastContext para ajuste proporcional
*/
import { Package, ArrowUpDown, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useFilters } from "@/contexts/FilterContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useForecast } from "@/contexts/ForecastContext";
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
  const { filteredProducts, isFiltered } = useFilters();
  const { activeMonths } = usePeriod();
  const { getMonthlyAdjustmentRatio } = useForecast();
  const [sortField, setSortField] = useState<SortField>("forecast");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Compute period-aware forecasts for each product
  // Sums only the activeMonths from PeriodContext (e.g., Fev/26 — Dez/26)
  const productsWithPeriod = useMemo(() => {
    return filteredProducts.map(product => {
      const catCdKey = `${product.categoria4}|${product.cd}`;
      const totalForCatCd = _catCdTotals[catCdKey] || 1;
      const weight = product.originalForecast / totalForCatCd;

      let periodOriginal = 0;
      let periodAdjusted = 0;

      for (const month of activeMonths) {
        const catCdMonthForecast = catN4CdMonthlyForecast[product.categoria4]?.[product.cd]?.[month] || 0;
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
  }, [filteredProducts, activeMonths, getMonthlyAdjustmentRatio]);

  const searchedProducts = useMemo(() => {
    if (!searchQuery.trim()) return productsWithPeriod;
    const query = searchQuery.toLowerCase();
    return productsWithPeriod.filter(p =>
      p.codigo.toString().includes(query) ||
      p.nome.toLowerCase().includes(query) ||
      p.categoria3.toLowerCase().includes(query) ||
      p.categoria4.toLowerCase().includes(query)
    );
  }, [productsWithPeriod, searchQuery]);

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

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage]);

  // Reset to page 1 when search or filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, filteredProducts]);

  const SortHeader = ({ field, label, align = "left" }: { field: SortField; label: string; align?: string }) => (
    <th
      className={`px-3 py-2 cursor-pointer hover:bg-[#0F4C75]/5 transition-colors select-none ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(field)}
    >
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-2.5 h-2.5 ${sortField === field ? "text-[#0F4C75]" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  );

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
        <div className="max-h-[540px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-20 bg-[#F8FAFC]">
              <tr className="border-b-2 border-border">
                <SortHeader field="codigo" label="Código" />
                <SortHeader field="nome" label="Nome do Produto" />
                <SortHeader field="categoria3" label="Cat. Nível 3" />
                <SortHeader field="categoria4" label="Cat. Nível 4" />
                <SortHeader field="comprador" label="Comprador" />
                <SortHeader field="cd" label="CD" />
                <SortHeader field="originalForecast" label="Previsão Original (un.)" align="right" />
                <SortHeader field="forecast" label="Previsão Ajustada (un.)" align="right" />
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, idx) => {
                  const diff = product.forecast - product.originalForecast;
                  const pct = product.originalForecast > 0 ? (diff / product.originalForecast) * 100 : 0;
                  const hasAdjustment = diff !== 0;
                  const hasLargeVariation = Math.abs(pct) > 20;
                  const isIncrease = diff > 0;
                  
                  return (
                  <tr
                    key={`${product.codigo}-${idx}`}
                    className={`border-b border-border/50 hover:bg-[#0F4C75]/[0.02] transition-colors ${
                      hasAdjustment
                        ? isIncrease
                          ? "bg-emerald-50/50"
                          : "bg-red-50/50"
                        : idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/50"
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
                          <span className={`text-[9px] font-bold ${
                            isIncrease ? "text-emerald-600" : "text-red-600"
                          }`}>
                            ({isIncrease ? "+" : ""}{pct.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedProducts.length)} de {sortedProducts.length} produtos
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-[#0F4C75]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? "bg-[#0F4C75] text-white"
                        : "border border-border hover:bg-[#0F4C75]/5"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-[#0F4C75]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Próximo
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
