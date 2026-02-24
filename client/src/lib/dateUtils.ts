/**
 * Date Utilities - Sistema dinâmico de datas
 * Detecta automaticamente o mês/ano atual e gera períodos de previsão
 * Não usa datas hardcoded - responde automaticamente a mudanças de período
 */

import { MONTHS_PT } from "./constants";

/**
 * Formata uma data como "Mês/YY" (ex: "Fev/26")
 */
export function formatMonthYear(date: Date): string {
  const month = MONTHS_PT[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Formata uma data como "2023_01" para busca em histórico
 */
export function formatMonthYearNumeric(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}_${month}`;
}

/**
 * Retorna a data do mês atual (1º dia do mês atual)
 */
export function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Retorna a data do próximo mês (1º dia do próximo mês)
 */
export function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Gera um array de meses a partir de uma data inicial
 * @param startDate - Data inicial (1º dia do mês)
 * @param count - Número de meses a gerar
 * @returns Array de strings no formato "Mês/YY" (ex: ["Fev/26", "Mar/26", ...])
 */
export function generateMonthRange(startDate: Date, count: number): string[] {
  const months: string[] = [];
  const date = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    months.push(formatMonthYear(date));
    date.setMonth(date.getMonth() + 1);
  }
  
  return months;
}

/**
 * Gera um array de meses numéricos a partir de uma data inicial
 * @param startDate - Data inicial (1º dia do mês)
 * @param count - Número de meses a gerar
 * @returns Array de strings no formato "YYYY_MM" (ex: ["2026_02", "2026_03", ...])
 */
export function generateMonthRangeNumeric(startDate: Date, count: number): string[] {
  const months: string[] = [];
  const date = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    months.push(formatMonthYearNumeric(date));
    date.setMonth(date.getMonth() + 1);
  }
  
  return months;
}

/**
 * Retorna os meses de previsão (próximos 11 meses a partir de hoje)
 */
export function getForecastMonths(): string[] {
  const currentMonth = getCurrentMonthStart();
  return generateMonthRange(currentMonth, 11);
}

/**
 * Retorna o mês atual formatado (ex: "Fev/26")
 */
export function getCurrentMonth(): string {
  return formatMonthYear(getCurrentMonthStart());
}

/**
 * Retorna o próximo mês formatado (ex: "Mar/26")
 */
export function getNextMonth(): string {
  return formatMonthYear(getNextMonthStart());
}

/**
 * Retorna a descrição do trimestre atual (mês atual + 2 próximos)
 * Ex: Se hoje é Fev, retorna "Fev-Abr/2026"
 */
export function getCurrentQuarterDescription(): string {
  const current = getCurrentMonthStart();
  const year = current.getFullYear();
  const monthIndex = current.getMonth();
  
  // Trimestre = mês atual + 2 próximos
  const startMonth = MONTHS_PT[monthIndex];
  const endMonthIndex = (monthIndex + 2) % 12;
  const endMonth = MONTHS_PT[endMonthIndex];
  
  // Se o trimestre cruza o ano (ex: Nov-Jan), ajusta o ano final
  const endYear = endMonthIndex < monthIndex ? year + 1 : year;
  
  return `${startMonth}-${endMonth}/${endYear}`;
}

/**
 * Retorna os 3 meses do trimestre atual
 */
export function getCurrentQuarterMonths(): string[] {
  const current = getCurrentMonthStart();
  return generateMonthRange(current, 3);
}

/**
 * Converte "Fev/26" para "2026_02"
 */
export function monthYearToNumeric(monthYear: string): string {
  const [month, year] = monthYear.split("/");
  const monthIndex = MONTHS_PT.indexOf(month) + 1;
  const fullYear = parseInt("20" + year);
  return `${fullYear}_${String(monthIndex).padStart(2, "0")}`;
}

/**
 * Converte "2026_02" para "Fev/26"
 */
export function numericToMonthYear(numeric: string): string {
  const [year, month] = numeric.split("_");
  const monthIndex = parseInt(month) - 1;
  const shortYear = String(parseInt(year)).slice(-2);
  return `${MONTHS_PT[monthIndex]}/${shortYear}`;
}

/**
 * Retorna o índice do mês em um array de meses
 * @param monthYear - Formato "Fev/26"
 * @param months - Array de meses
 */
export function getMonthIndex(monthYear: string, months: string[]): number {
  return months.indexOf(monthYear);
}

/**
 * Verifica se um mês está no passado
 */
export function isMonthInPast(monthYear: string): boolean {
  const [month, year] = monthYear.split("/");
  const monthIndex = MONTHS_PT.indexOf(month);
  const fullYear = parseInt("20" + year);
  
  const now = new Date();
  const monthDate = new Date(fullYear, monthIndex, 1);
  
  return monthDate < now;
}

/**
 * Retorna o período de data formatado (ex: "Fev/26 — Dez/26")
 */
export function getPeriodDescription(): string {
  const forecastMonths = getForecastMonths();
  const start = forecastMonths[0];
  const end = forecastMonths[forecastMonths.length - 1];
  return `${start} — ${end}`;
}

/**
 * Retorna a quantidade de meses no período de previsão
 */
export function getForecastMonthCount(): number {
  return getForecastMonths().length;
}

/**
 * Retorna a descrição do período com contagem de meses
 * Ex: "Fev/26 — Dez/26 · 11 mês(es)"
 */
export function getPeriodDescriptionWithCount(): string {
  const period = getPeriodDescription();
  const count = getForecastMonthCount();
  const plural = count === 1 ? "mês" : "mês(es)";
  return `${period} · ${count} ${plural}`;
}
