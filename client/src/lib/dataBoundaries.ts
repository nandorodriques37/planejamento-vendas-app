/*
  dataBoundaries.ts — Detecção automática das fronteiras dos dados

  Escaneia catN4CdMonthlyHistorico e catN4CdMonthlyForecast
  para determinar dinamicamente onde termina o histórico e
  começa a previsão. Quando a base for atualizada com um novo
  mês de histórico, toda a aplicação se ajusta automaticamente.

  Arquivo separado para não alterar o mockData.ts (620KB).
*/
import { catN4CdMonthlyHistorico, catN4CdMonthlyForecast } from "./mockData";
import { MONTHS_PT, MONTHS_PT_SORT } from "./constants";

// ============================================================
// Helpers internos
// ============================================================

function monthYearToNumeric(my: string): string {
  const [m, y] = my.split("/");
  const fullYear = 2000 + parseInt(y);
  const monthIdx = (MONTHS_PT_SORT[m] ?? 0) + 1;
  return `${fullYear}_${String(monthIdx).padStart(2, "0")}`;
}

function numericToMonthYear(numeric: string): string {
  const [year, month] = numeric.split("_");
  const monthIndex = parseInt(month) - 1;
  const shortYear = String(parseInt(year)).slice(-2);
  return `${MONTHS_PT[monthIndex]}/${shortYear}`;
}

function numericToDate(numeric: string): Date {
  const [year, month] = numeric.split("_");
  return new Date(parseInt(year), parseInt(month) - 1, 1);
}

function formatMonthYear(date: Date): string {
  return `${MONTHS_PT[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;
}

function generateMonthRange(startDate: Date, count: number): string[] {
  const months: string[] = [];
  const d = new Date(startDate);
  for (let i = 0; i < count; i++) {
    months.push(formatMonthYear(d));
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

// ============================================================
// Detecção das fronteiras
// ============================================================

export const DATA_BOUNDARIES = (() => {
  // 1. Detectar fronteiras do histórico (catN4CdMonthlyHistorico, formato "YYYY_MM")
  let firstHistNum = "9999_12";
  let lastHistNum = "0000_01";

  for (const cat of Object.keys(catN4CdMonthlyHistorico)) {
    const catData = catN4CdMonthlyHistorico[cat];
    for (const cd of Object.keys(catData)) {
      for (const mk of Object.keys(catData[Number(cd)])) {
        if (mk < firstHistNum) firstHistNum = mk;
        if (mk > lastHistNum) lastHistNum = mk;
      }
    }
  }

  // 2. Detectar meses de forecast (catN4CdMonthlyForecast, formato "Mês/YY")
  const forecastSet = new Set<string>();
  for (const cat of Object.keys(catN4CdMonthlyForecast)) {
    const catData = catN4CdMonthlyForecast[cat];
    for (const cd of Object.keys(catData)) {
      for (const mk of Object.keys(catData[cd])) {
        forecastSet.add(mk);
      }
    }
  }
  const allForecastMonthsSorted = Array.from(forecastSet)
    .sort((a, b) => monthYearToNumeric(a).localeCompare(monthYearToNumeric(b)));

  // 3. Valores derivados
  const firstHistDate = numericToDate(firstHistNum);
  const lastHistDate = numericToDate(lastHistNum);
  const firstForecastDate = new Date(lastHistDate.getFullYear(), lastHistDate.getMonth() + 1, 1);

  const lastHistoricalMonth = numericToMonthYear(lastHistNum);     // ex: "Jan/26"
  const firstForecastMonth = formatMonthYear(firstForecastDate);   // ex: "Fev/26"

  // 4. Array de meses históricos
  const histCount = (lastHistDate.getFullYear() - firstHistDate.getFullYear()) * 12
    + (lastHistDate.getMonth() - firstHistDate.getMonth()) + 1;
  const historicalMonths = generateMonthRange(firstHistDate, histCount);

  // 5. Array de meses de forecast (máximo 11 meses a partir do primeiro)
  const maxForecastMonths = 11;
  const forecastMonthsDisplay = generateMonthRange(firstForecastDate, maxForecastMonths);
  const forecastMonths = forecastMonthsDisplay.filter(m => allForecastMonthsSorted.includes(m));
  const finalForecastMonths = forecastMonths.length > 0 ? forecastMonths : forecastMonthsDisplay;

  // 6. Todos os meses (histórico + forecast)
  const allMonths = [...historicalMonths, ...finalForecastMonths];

  return {
    // Formato numérico
    firstHistoricalNumeric: firstHistNum,   // "2023_01"
    lastHistoricalNumeric: lastHistNum,     // "2026_01"

    // Formato display
    lastHistoricalMonth,                    // "Jan/26"
    firstForecastMonth,                     // "Fev/26"

    // Objetos Date
    firstHistoricalDate: firstHistDate,
    lastHistoricalDate: lastHistDate,
    firstForecastDate,

    // Arrays prontos para uso
    historicalMonths,                       // ["Jan/23", "Fev/23", ..., "Jan/26"]
    forecastMonths: finalForecastMonths,    // ["Fev/26", "Mar/26", ..., "Dez/26"]
    allMonths,                              // ["Jan/23", ..., "Dez/26"]

    // Todos os meses de forecast encontrados nos dados (pode incluir 2027)
    allForecastMonthsInData: allForecastMonthsSorted,
  };
})();
