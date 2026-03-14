/*
  dataDerived.ts — Derivação dinâmica de monthlyData e comparisonData

  Calcula ambos os arrays a partir das estruturas de dados brutas:
  - catN4CdMonthlyHistorico  (cat4 → cdNumber → "YYYY_MM" → valor)
  - catN4CdMonthlyQtdBruta   (cat4 → cdNumber → "YYYY_MM" → valor)
  - catN4CdMonthlyForecast   (cat4 → "CD N"   → "Mmm/YY" → valor)

  Isso elimina a necessidade de arrays estáticos pré-calculados
  e permite que o sistema se adapte automaticamente quando os dados
  de entrada mudam (ex: novo mês de histórico ou nova categoria).
*/
import {
  catN4CdMonthlyHistorico,
  catN4CdMonthlyQtdBruta,
  catN4CdMonthlyForecast,
  type ComparisonRow,
} from "./mockData";
import { DATA_BOUNDARIES } from "./dataBoundaries";

// Re-export for consumers
export type { ComparisonRow };

// ============================================================
// Helpers
// ============================================================

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Convert "Fev/26" → "2026_02" */
function displayToNumeric(month: string): string {
  const [name, yr] = month.split("/");
  const mi = MONTHS_PT.indexOf(name);
  if (mi === -1) return "";
  return `20${yr}_${String(mi + 1).padStart(2, "0")}`;
}

/** Convert "2026_02" → "Fev/26" */
function numericToDisplay(numericMonth: string): string {
  const [yyyy, mm] = numericMonth.split("_");
  const mi = parseInt(mm, 10) - 1;
  if (mi < 0 || mi > 11) return "";
  return `${MONTHS_PT[mi]}/${yyyy.slice(2)}`;
}

/** Shift a display month by N months. shiftDisplayMonth("Fev/26", -12) → "Fev/25" */
function shiftDisplayMonth(month: string, delta: number): string {
  const [name, yr] = month.split("/");
  const mi = MONTHS_PT.indexOf(name);
  const totalMonths = (2000 + parseInt(yr, 10)) * 12 + mi + delta;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = ((totalMonths % 12) + 12) % 12;
  return `${MONTHS_PT[newMonth]}/${String(newYear - 2000).padStart(2, "0")}`;
}

// ============================================================
// Sum helpers across all categories/CDs
// ============================================================

/** Sum historico across all catN4s and CDs for a given numeric month ("2023_01") */
function sumHistoricoAll(numericMonth: string): number {
  let total = 0;
  for (const cat of Object.keys(catN4CdMonthlyHistorico)) {
    const cdData = catN4CdMonthlyHistorico[cat];
    for (const cd of Object.keys(cdData)) {
      const val = cdData[cd as unknown as number]?.[numericMonth];
      if (val !== undefined && val !== null) total += val;
    }
  }
  return total;
}

/** Sum qtdBruta across all catN4s and CDs for a given numeric month */
function sumQtdBrutaAll(numericMonth: string): number {
  let total = 0;
  for (const cat of Object.keys(catN4CdMonthlyQtdBruta)) {
    const cdData = catN4CdMonthlyQtdBruta[cat];
    for (const cd of Object.keys(cdData)) {
      const val = cdData[cd as unknown as number]?.[numericMonth];
      if (val !== undefined && val !== null) total += val;
    }
  }
  return total;
}

/** Sum forecast across all catN4s and CDs for a given display month ("Fev/26") */
function sumForecastAll(displayMonth: string): number {
  let total = 0;
  for (const cat of Object.keys(catN4CdMonthlyForecast)) {
    const cdData = catN4CdMonthlyForecast[cat];
    for (const cd of Object.keys(cdData)) {
      const val = cdData[cd]?.[displayMonth];
      if (val !== undefined && val !== null) total += val;
    }
  }
  return total;
}

/** Sum historico for a specific catN4 across all CDs for a numeric month */
function sumHistoricoCat(cat: string, numericMonth: string): number {
  let total = 0;
  const cdData = catN4CdMonthlyHistorico[cat];
  if (!cdData) return 0;
  for (const cd of Object.keys(cdData)) {
    const val = cdData[cd as unknown as number]?.[numericMonth];
    if (val !== undefined && val !== null) total += val;
  }
  return total;
}

/** Sum forecast for a specific catN4 across all CDs for a display month */
function sumForecastCat(cat: string, displayMonth: string): number {
  let total = 0;
  const cdData = catN4CdMonthlyForecast[cat];
  if (!cdData) return 0;
  for (const cd of Object.keys(cdData)) {
    const val = cdData[cd]?.[displayMonth];
    if (val !== undefined && val !== null) total += val;
  }
  return total;
}

// ============================================================
// monthlyData — derived dynamically
// ============================================================

export interface MonthlyDataPoint {
  month: string;
  historico: number | null;
  qtdBruta: number | null;
  previsao: number | null;
}

export const monthlyData: MonthlyDataPoint[] = (() => {
  const histMonths = DATA_BOUNDARIES.historicalMonths;
  const fcstMonths = DATA_BOUNDARIES.forecastMonths;
  const result: MonthlyDataPoint[] = [];

  // Historical months
  for (const month of histMonths) {
    const numKey = displayToNumeric(month);
    const hist = sumHistoricoAll(numKey);
    const qtd = sumQtdBrutaAll(numKey);
    result.push({
      month,
      historico: hist > 0 ? Math.round(hist) : null,
      qtdBruta: qtd > 0 ? Math.round(qtd) : null,
      previsao: null,
    });
  }

  // Forecast months
  for (const month of fcstMonths) {
    const prev = sumForecastAll(month);
    result.push({
      month,
      historico: null,
      qtdBruta: null,
      previsao: prev > 0 ? Math.round(prev * 100) / 100 : null,
    });
  }

  return result;
})();

// ============================================================
// comparisonData — derived dynamically
// ============================================================

/** Safe percentage variation: ((a / b) - 1) * 100, null if b <= 0 */
function pctVar(current: number, reference: number): number | null {
  if (reference <= 0) return null;
  return Math.round(((current / reference) - 1) * 1000) / 10;
}

export const comparisonData: ComparisonRow[] = (() => {
  const fm = DATA_BOUNDARIES.forecastMonths;
  if (fm.length < 4) return [];

  const m0 = fm[0]; // First forecast month (e.g., "Fev/26")
  const m1 = fm[1]; // Second (e.g., "Mar/26")
  const m2 = fm[2]; // Third (e.g., "Abr/26")
  const m3 = fm[3]; // Fourth (e.g., "Mai/26")

  // Last historical month (e.g., "Jan/26") — for month-over-month
  const lastHist = DATA_BOUNDARIES.lastHistoricalMonth;
  const lastHistNum = displayToNumeric(lastHist);

  // LY months (same month, previous year)
  const m0LY = shiftDisplayMonth(m0, -12);
  const m1LY = shiftDisplayMonth(m1, -12);
  const m2LY = shiftDisplayMonth(m2, -12);
  const m3LY = shiftDisplayMonth(m3, -12);
  const m0LYNum = displayToNumeric(m0LY);
  const m1LYNum = displayToNumeric(m1LY);
  const m2LYNum = displayToNumeric(m2LY);
  const m3LYNum = displayToNumeric(m3LY);

  // Trimester months:
  // triAnterior = same 3 months last year
  const triAntMonths = [m0LY, m1LY, m2LY].map(displayToNumeric);

  // ultTrimestre = last 3 historical months (e.g., Nov/25, Dez/25, Jan/26)
  const hm = DATA_BOUNDARIES.historicalMonths;
  const ultTriMonths = hm.length >= 3
    ? [hm[hm.length - 3], hm[hm.length - 2], hm[hm.length - 1]].map(displayToNumeric)
    : [];

  // penTrimestre = 3 months before ultTrimestre (e.g., Ago/25, Set/25, Out/25)
  const penTriMonths = hm.length >= 6
    ? [hm[hm.length - 6], hm[hm.length - 5], hm[hm.length - 4]].map(displayToNumeric)
    : [];

  // All catN4s present in forecast data
  const allCatN4s = Object.keys(catN4CdMonthlyForecast);

  const rows: ComparisonRow[] = [];

  for (const cat of allCatN4s) {
    const mes0Val = Math.round(sumForecastCat(cat, m0));
    const mes1Val = Math.round(sumForecastCat(cat, m1));
    const mes2Val = Math.round(sumForecastCat(cat, m2));
    const mes3Val = Math.round(sumForecastCat(cat, m3));

    // LY values from historico
    const m0LYVal = sumHistoricoCat(cat, m0LYNum);
    const m1LYVal = sumHistoricoCat(cat, m1LYNum);
    const m2LYVal = sumHistoricoCat(cat, m2LYNum);
    const m3LYVal = sumHistoricoCat(cat, m3LYNum);

    // LM value (last historical month)
    const lmVal = sumHistoricoCat(cat, lastHistNum);

    // Trimester calculations
    const triAtual = mes0Val + mes1Val + mes2Val;
    const triAnterior = triAntMonths.reduce((s, m) => s + sumHistoricoCat(cat, m), 0);
    const ultTrimestre = ultTriMonths.reduce((s, m) => s + sumHistoricoCat(cat, m), 0);
    const penTrimestre = penTriMonths.reduce((s, m) => s + sumHistoricoCat(cat, m), 0);

    rows.push({
      categoria: cat,
      mes0: mes0Val,
      varLY: pctVar(mes0Val, m0LYVal),
      varLM: pctVar(mes0Val, lmVal),
      mes1: mes1Val,
      varLY1: pctVar(mes1Val, m1LYVal),
      mes2: mes2Val,
      varLY2: pctVar(mes2Val, m2LYVal),
      mes3: mes3Val,
      varLY3: pctVar(mes3Val, m3LYVal),
      triAnterior: triAnterior > 0 ? Math.round(triAnterior) : null,
      penTrimestre: penTrimestre > 0 ? Math.round(penTrimestre) : null,
      ultTrimestre: ultTrimestre > 0 ? Math.round(ultTrimestre) : null,
      triAtual,
      varTriLY: pctVar(triAtual, triAnterior),
      varTriPenTri: pctVar(triAtual, penTrimestre),
      varTriUltTri: pctVar(triAtual, ultTrimestre),
    });
  }

  return rows;
})();
