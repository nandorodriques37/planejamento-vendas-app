/*
  SalesChart Component — Clean Pharma Analytics
  Gráfico de linha com:
  - Histórico de vendas regular (linha sólida azul escuro)
  - Histórico de Qtd Bruta (linha sólida azul claro)
  - Previsão estatística original (linha pontilhada laranja)
  - Previsão ajustada após colaboração (linha sólida verde) — aparece após salvar ajustes
*/
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useForecast } from "@/contexts/ForecastContext";
import { useFilters } from "@/contexts/FilterContext";
import { useShallow } from "zustand/react/shallow";
import { DATA_BOUNDARIES } from "@/services/dataProvider";

function formatNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const labelMap: Record<string, string> = {
      historico: "Venda Regular",
      qtdBruta: "Qtd Bruta",
      previsao: "Previsão Original",
      previsaoAjustada: "Previsão Ajustada",
    };
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
        {payload.map((entry: any) => (
          entry.value !== null && (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {labelMap[entry.dataKey] || entry.dataKey}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {Math.round(Number(entry.value)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </span>
            </div>
          )
        ))}
      </div>
    );
  }
  return null;
}

export default function SalesChart() {
  const hasAdjustments = useForecast(state => state.hasAdjustments);
  const { isFiltered, appliedFilters, filteredMonthlyData, hasAdjustedForecast } = useFilters(useShallow(state => ({
    isFiltered: state.isFiltered,
    appliedFilters: state.appliedFilters,
    filteredMonthlyData: state.filteredMonthlyData,
    hasAdjustedForecast: state.hasAdjustedForecast
  })));
  const showAdjustedLine = hasAdjustments && hasAdjustedForecast;

  // Build filter description (memoized)
  const filterDesc = useMemo(() => {
    if (!isFiltered) return null;
    return [
      appliedFilters.categoriaN4.length > 0 && `Cat N4: ${appliedFilters.categoriaN4.join(", ")}`,
      appliedFilters.categoriaN3.length > 0 && `Cat N3: ${appliedFilters.categoriaN3.join(", ")}`,
      appliedFilters.centroDistribuicao.length > 0 && `${appliedFilters.centroDistribuicao.join(", ")}`,
      appliedFilters.comprador.length > 0 && `Comprador: ${appliedFilters.comprador.join(", ")}`,
      appliedFilters.fornecedor.length > 0 && `Fornecedor: ${appliedFilters.fornecedor.join(", ")}`,
      appliedFilters.codigoProduto && `Produto: ${appliedFilters.codigoProduto}`,
    ].filter(Boolean).join(" · ");
  }, [isFiltered, appliedFilters]);

  return (
    <div id="sales-chart-container" className="bg-white border border-border rounded-xl shadow-sm p-5">
      {/* Chart header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Histórico de Vendas e Previsão</h2>
            <p className="text-[11px] text-muted-foreground">
              {(() => {
                const first = DATA_BOUNDARIES.historicalMonths[0];
                const last = DATA_BOUNDARIES.forecastMonths[DATA_BOUNDARIES.forecastMonths.length - 1];
                const fmt = (m: string) => { const [n, y] = m.split("/"); return `${n}/20${y}`; };
                return `${fmt(first)} — ${fmt(last)}`;
              })()} · Vendas regulares agregadas (unidades)
              {isFiltered && (
                <span className="ml-2 text-primary font-semibold">· Filtro: {filterDesc}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-primary rounded-full" />
            <span className="text-[11px] text-muted-foreground font-medium">Venda Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-[#60A5FA] rounded-full" />
            <span className="text-[11px] text-muted-foreground font-medium">Qtd Bruta</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="4" viewBox="0 0 24 4" className="flex-shrink-0">
              <line x1="0" y1="2" x2="24" y2="2" stroke="#D97706" strokeWidth="2.5" strokeDasharray="5 3" />
            </svg>
            <span className="text-[11px] text-muted-foreground font-medium">Previsão Original</span>
          </div>
          {showAdjustedLine && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[#059669] rounded-full" />
              <span className="text-[11px] text-emerald-700 font-semibold">Previsão Ajustada</span>
            </div>
          )}
        </div>
      </div>

      {/* Adjustment indicator */}
      {showAdjustedLine && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-800">
            Ajustes colaborativos aplicados — a linha verde mostra a previsão após os ajustes salvos
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredMonthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#64748B" }}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={DATA_BOUNDARIES.firstForecastMonth}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Início Previsão",
                position: "top",
                fill: "#94A3B8",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            {/* Historical sales (Venda Regular) — solid dark blue */}
            <Line
              type="monotone"
              dataKey="historico"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)", stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
            />
            {/* Historical Qtd Bruta — solid light blue */}
            <Line
              type="monotone"
              dataKey="qtdBruta"
              stroke="#60A5FA"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#60A5FA", stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
            />
            {/* Original forecast — dashed orange */}
            <Line
              type="monotone"
              dataKey="previsao"
              stroke="#D97706"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              activeDot={{ r: 4, fill: "#D97706", stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
            />
            {/* Adjusted forecast — solid green (only when adjustments exist) */}
            {showAdjustedLine && (
              <Line
                type="monotone"
                dataKey="previsaoAjustada"
                stroke="#059669"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
