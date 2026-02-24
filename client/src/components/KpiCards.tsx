/*
  KpiCards Component — Clean Pharma Analytics
  Cards de indicadores-chave no topo do dashboard
  Dinâmico: responde aos filtros e ajustes salvos
*/
import { Package, TrendingUp, Edit3, BarChart3 } from "lucide-react";
import { useForecast } from "@/contexts/ForecastContext";
import { useFilters } from "@/contexts/FilterContext";
import { useKpiValues } from "@/hooks/useKpiValues";

function fmt(val: number): string {
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export default function KpiCards() {
  const { categoriasEditadas, totalImpact, hasAdjustments } = useForecast();
  const { filteredMonthlyData, isFiltered, filteredProducts } = useFilters();

  const kpiValues = useKpiValues(filteredMonthlyData, filteredProducts, isFiltered);

  const kpis = [
    {
      label: "Venda Mês Atual",
      value: fmt(kpiValues.mesAtual),
      subtext: isFiltered ? `${kpiValues.currentMonth} (filtrado)` : kpiValues.currentMonth,
      variation: `${kpiValues.varMensal >= 0 ? "+" : ""}${kpiValues.varMensal.toFixed(1)}%`,
      positive: kpiValues.varMensal >= 0,
      icon: Package,
    },
    {
      label: "Previsão Próximo Mês",
      value: fmt(kpiValues.proxMes),
      subtext: isFiltered ? `${kpiValues.nextMonth} (filtrado)` : kpiValues.nextMonth,
      variation: `${kpiValues.varProxMes >= 0 ? "+" : ""}${kpiValues.varProxMes.toFixed(1)}%`,
      positive: kpiValues.varProxMes >= 0,
      icon: TrendingUp,
    },
    {
      label: "Trimestre Atual",
      value: fmt(kpiValues.trimestre),
      subtext: isFiltered ? `${kpiValues.quarterDesc} (filtrado)` : kpiValues.quarterDesc,
      variation: null,
      positive: true,
      icon: BarChart3,
    },
    {
      label: "Ajustes Realizados",
      value: hasAdjustments ? `${categoriasEditadas} / ${kpiValues.totalCats}` : `0 / ${kpiValues.totalCats}`,
      subtext: hasAdjustments
        ? `Impacto total: ${totalImpact > 0 ? "+" : ""}${fmt(totalImpact)} un.`
        : "Categorias editadas",
      variation: hasAdjustments
        ? `${totalImpact > 0 ? "+" : ""}${((totalImpact / Math.max(kpiValues.mesAtual, 1)) * 100).toFixed(1)}%`
        : null,
      positive: totalImpact >= 0,
      icon: Edit3,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
            kpi.label === "Ajustes Realizados" && hasAdjustments
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-border"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${
              kpi.label === "Ajustes Realizados" && hasAdjustments
                ? "bg-emerald-100"
                : "bg-[#0F4C75]/8"
            }`}>
              <kpi.icon className={`w-4.5 h-4.5 ${
                kpi.label === "Ajustes Realizados" && hasAdjustments
                  ? "text-emerald-700"
                  : "text-[#0F4C75]"
              }`} />
            </div>
            {kpi.variation && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  kpi.positive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {kpi.variation}
              </span>
            )}
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight leading-none mb-1">
            {kpi.value}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {kpi.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.subtext}</p>
        </div>
      ))}
    </div>
  );
}
