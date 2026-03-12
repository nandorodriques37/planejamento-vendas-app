/**
 * Forecast Service
 *
 * Abstrai o acesso aos dados de forecast e produtos.
 * Implementação atual: retorna dados de mockData.ts (local).
 * Migração para API: substituir por chamadas ao apiClient.
 */
import {
  allProducts,
  catN4CdMonthlyForecast,
  catN4CdMonthlyHistorico,
  catN4CdMonthlyQtdBruta,
  cdMonthlyData,
  type Product,
} from "@/lib/mockData";
import { monthlyData, comparisonData, type ComparisonRow } from "@/lib/dataDerived";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";
import type {
  ProductsResponse,
  MonthlyDataResponse,
  CategoryForecastResponse,
  ComparisonResponse,
  DataBoundaries,
} from "@/types/api";

/**
 * Retorna todos os produtos.
 * Futuramente: GET /api/products
 */
export async function getProducts(): Promise<ProductsResponse> {
  return {
    products: allProducts,
    total: allProducts.length,
  };
}

/**
 * Retorna dados mensais agregados (histórico + previsão).
 * Futuramente: GET /api/forecast/monthly
 */
export async function getMonthlyData(): Promise<MonthlyDataResponse> {
  const boundaries: DataBoundaries = {
    firstHistoricalNumeric: DATA_BOUNDARIES.firstHistoricalNumeric,
    lastHistoricalNumeric: DATA_BOUNDARIES.lastHistoricalNumeric,
    lastHistoricalMonth: DATA_BOUNDARIES.lastHistoricalMonth,
    firstForecastMonth: DATA_BOUNDARIES.firstForecastMonth,
    historicalMonths: DATA_BOUNDARIES.historicalMonths,
    forecastMonths: DATA_BOUNDARIES.forecastMonths,
    allMonths: DATA_BOUNDARIES.allMonths,
    allForecastMonthsInData: DATA_BOUNDARIES.allForecastMonthsInData,
  };

  return {
    data: monthlyData.map(d => ({
      month: d.month,
      historico: d.historico,
      qtdBruta: d.qtdBruta,
      previsao: d.previsao,
      previsaoAjustada: null,
    })),
    boundaries,
  };
}

/**
 * Retorna dados de forecast por categoria/CD/mês.
 * Futuramente: GET /api/forecast/categories
 */
export async function getCategoryForecastData(): Promise<CategoryForecastResponse> {
  return {
    forecast: catN4CdMonthlyForecast,
    historico: catN4CdMonthlyHistorico,
    qtdBruta: catN4CdMonthlyQtdBruta,
  };
}

/**
 * Retorna dados de comparação por categoria N4.
 * Futuramente: GET /api/forecast/comparison
 */
export async function getComparisonData(): Promise<ComparisonResponse> {
  return {
    data: comparisonData,
  };
}

/**
 * Retorna dados mensais por CD.
 * Futuramente: GET /api/forecast/cd-monthly
 */
export async function getCdMonthlyData(): Promise<typeof cdMonthlyData> {
  return cdMonthlyData;
}
