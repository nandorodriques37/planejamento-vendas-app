/**
 * useKpiValues — Hook compartilhado para cálculo dos KPIs
 *
 * Usado por KpiCards e ExportButtons para evitar duplicação de lógica.
 */
import { useMemo } from "react";
import { DATA_BOUNDARIES } from "@/services/dataProvider";
import type { FilteredMonthlyPoint } from "@/contexts/FilterContext";
import type { Product } from "@/types/domain";

export interface KpiValues {
  mesAtual: number;
  proxMes: number;
  trimestre: number;
  varMensal: number;
  varProxMes: number;
  totalCats: number;
  currentMonth: string;
  nextMonth: string;
  quarterDesc: string;
}

export function useKpiValues(
  filteredMonthlyData: FilteredMonthlyPoint[],
  filteredProducts: Product[],
  isFiltered: boolean,
): KpiValues {
  return useMemo(() => {
    const fm = DATA_BOUNDARIES.forecastMonths;
    const currentMonth = fm[0];
    const nextMonth = fm.length > 1 ? fm[1] : currentMonth;
    const lastHistMonth = DATA_BOUNDARIES.lastHistoricalMonth;

    const mesAtualData = filteredMonthlyData.find(d => d.month === currentMonth);
    const proxMesData = filteredMonthlyData.find(d => d.month === nextMonth);
    const mesAnteriorData = filteredMonthlyData.find(d => d.month === lastHistMonth);

    const trimestreMonths = fm.slice(0, 3);
    const trimestre = Math.round(
      trimestreMonths.reduce((sum, month) => {
        const data = filteredMonthlyData.find(d => d.month === month);
        return sum + (data?.previsao ?? 0);
      }, 0),
    );

    const mesAtual = Math.round(mesAtualData?.previsao ?? 0);
    const proxMes = Math.round(proxMesData?.previsao ?? 0);
    const mesAnterior = Math.round(mesAnteriorData?.historico ?? 0);

    const varMensal = mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : 0;
    const varProxMes = mesAtual > 0 ? ((proxMes - mesAtual) / mesAtual) * 100 : 0;

    const totalCats = isFiltered
      ? Array.from(new Set(filteredProducts.map(p => p.categoria4))).length
      : 28;

    const quarterEnd = fm.length >= 3 ? fm[2] : fm[fm.length - 1];
    const [startName] = currentMonth.split("/");
    const [endName, endYr] = quarterEnd.split("/");
    const quarterDesc = `${startName}-${endName}/20${endYr}`;

    return { mesAtual, proxMes, trimestre, varMensal, varProxMes, totalCats, currentMonth, nextMonth, quarterDesc };
  }, [filteredMonthlyData, isFiltered, filteredProducts]);
}
