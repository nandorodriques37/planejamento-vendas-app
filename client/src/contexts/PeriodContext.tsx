/*
  PeriodContext — Gerencia o período de previsão selecionado
  
  O período determina:
  - Quais meses aparecem como colunas na tabela de ajustes
  - Quais meses são considerados para cálculo de forecast
  - O texto exibido no Header
  
  Meses disponíveis: detectados dinamicamente de dataBoundaries
*/
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";

// All available forecast months — detected dynamically from data
const ALL_FORECAST_MONTHS = DATA_BOUNDARIES.forecastMonths;

// Month labels for display
const MONTH_OPTIONS = ALL_FORECAST_MONTHS.map(m => ({
  value: m,
  label: m,
}));

interface PeriodContextType {
  startMonth: string;
  endMonth: string;
  activeMonths: string[];
  allForecastMonths: string[];
  monthOptions: { value: string; label: string }[];
  setStartMonth: (month: string) => void;
  setEndMonth: (month: string) => void;
  periodLabel: string;
}

const PeriodContext = createContext<PeriodContextType | null>(null);

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [startMonth, setStartMonthState] = useState(ALL_FORECAST_MONTHS[0]);
  const [endMonth, setEndMonthState] = useState(ALL_FORECAST_MONTHS[ALL_FORECAST_MONTHS.length - 1]);

  const setStartMonth = useCallback((month: string) => {
    const startIdx = ALL_FORECAST_MONTHS.indexOf(month);
    const endIdx = ALL_FORECAST_MONTHS.indexOf(endMonth);
    if (startIdx >= 0) {
      setStartMonthState(month);
      // If start is after end, move end to start
      if (startIdx > endIdx) {
        setEndMonthState(month);
      }
    }
  }, [endMonth]);

  const setEndMonth = useCallback((month: string) => {
    const startIdx = ALL_FORECAST_MONTHS.indexOf(startMonth);
    const endIdx = ALL_FORECAST_MONTHS.indexOf(month);
    if (endIdx >= 0) {
      setEndMonthState(month);
      // If end is before start, move start to end
      if (endIdx < startIdx) {
        setStartMonthState(month);
      }
    }
  }, [startMonth]);

  const activeMonths = useMemo(() => {
    const startIdx = ALL_FORECAST_MONTHS.indexOf(startMonth);
    const endIdx = ALL_FORECAST_MONTHS.indexOf(endMonth);
    if (startIdx < 0 || endIdx < 0) return ALL_FORECAST_MONTHS;
    return ALL_FORECAST_MONTHS.slice(startIdx, endIdx + 1);
  }, [startMonth, endMonth]);

  // Format period label: "Fev/2026 — Dez/2026"
  const periodLabel = useMemo(() => {
    const formatFull = (m: string) => {
      const [name, year] = m.split("/");
      return `${name}/20${year}`;
    };
    return `${formatFull(startMonth)} — ${formatFull(endMonth)}`;
  }, [startMonth, endMonth]);

  return (
    <PeriodContext.Provider
      value={{
        startMonth,
        endMonth,
        activeMonths,
        allForecastMonths: ALL_FORECAST_MONTHS,
        monthOptions: MONTH_OPTIONS,
        setStartMonth,
        setEndMonth,
        periodLabel,
      }}
    >
      {children}
    </PeriodContext.Provider>
  );
}
