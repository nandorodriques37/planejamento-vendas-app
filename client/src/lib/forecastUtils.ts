import type { AdjustmentType } from "@/store/forecastEngine";

/**
 * Calcula o valor ajustado de um forecast mensal com base no tipo de ajuste.
 * Usado em AdjustmentTable e SupplierAdjustment.
 */
export function calculateMonthlyAdjusted(original: number, type: AdjustmentType, value: number): number {
  if (type === "%") {
    return Math.round(original * (1 + value / 100));
  }
  return original + value;
}
