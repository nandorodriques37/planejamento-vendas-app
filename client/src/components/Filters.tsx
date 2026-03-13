/*
  Filters Component — Clean Pharma Analytics
  Barra de filtros horizontal colapsável acima do gráfico
  Conectado ao FilterContext para filtrar dados em todos os componentes
  
  MULTI-SELEÇÃO: Todos os dropdowns agora suportam seleção múltipla
  com checkboxes, busca por digitação, badges e contagem de selecionados
*/
import { useState } from "react";
import { ChevronDown, Filter, RotateCcw, Search } from "lucide-react";
import { categoriesNivel3, categoriesNivel4, centrosDistribuicao, compradores, fornecedores } from "@/services/dataProvider";
import { useFilters } from "@/contexts/FilterContext";
import { useShallow } from "zustand/react/shallow";
import MultiSelectCombobox from "./MultiSelectCombobox";

export default function Filters() {
  const [expanded, setExpanded] = useState(true);
  const { filters, setFilter, applyFilters, clearFilters, isFiltered } = useFilters(useShallow(state => ({
    filters: state.filters,
    setFilter: state.setFilter,
    applyFilters: state.applyFilters,
    clearFilters: state.clearFilters,
    isFiltered: state.isFiltered
  })));

  // Count total active filter selections
  const activeCount = (
    (filters.codigoProduto ? 1 : 0) +
    filters.categoriaN3.length +
    filters.categoriaN4.length +
    filters.centroDistribuicao.length +
    filters.comprador.length +
    filters.fornecedor.length
  );

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm">
      {/* Filter header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
          {isFiltered && (
            <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full">
              ATIVO
            </span>
          )}
          {activeCount > 0 && !isFiltered && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {activeCount} pendente{activeCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground font-medium ml-1">
            (Selecione para refinar os dados)
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Filter content */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Código Produto - remains single text input */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Código Produto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ex: 18258"
                  value={filters.codigoProduto}
                  onChange={(e) => setFilter("codigoProduto", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
                  className="w-full min-w-[160px] h-9 pl-9 pr-3 text-sm bg-white border border-border rounded-lg hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <MultiSelectCombobox
              label="Categoria Nível 3"
              options={categoriesNivel3}
              placeholder="Selecione..."
              values={filters.categoriaN3}
              onChange={(vals) => setFilter("categoriaN3", vals)}
            />
            <MultiSelectCombobox
              label="Categoria Nível 4"
              options={categoriesNivel4}
              placeholder="Selecione..."
              values={filters.categoriaN4}
              onChange={(vals) => setFilter("categoriaN4", vals)}
            />
            <MultiSelectCombobox
              label="Centro de Distribuição"
              options={centrosDistribuicao}
              placeholder="Selecione..."
              values={filters.centroDistribuicao}
              onChange={(vals) => setFilter("centroDistribuicao", vals)}
            />
            <MultiSelectCombobox
              label="Comprador"
              options={compradores}
              placeholder="Selecione..."
              values={filters.comprador}
              onChange={(vals) => setFilter("comprador", vals)}
            />
            <MultiSelectCombobox
              label="Fornecedor"
              options={fornecedores}
              placeholder="Selecione..."
              values={filters.fornecedor}
              onChange={(vals) => setFilter("fornecedor", vals)}
            />
            <div className="flex items-end gap-2 ml-auto">
              <button
                onClick={applyFilters}
                className="h-9 px-4 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5" />
                Aplicar
              </button>
              <button
                onClick={clearFilters}
                className="h-9 px-3 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
