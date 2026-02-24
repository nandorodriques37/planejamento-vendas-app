import { ReactNode } from "react";
import { useForecastStore } from "../store/forecastStore";

export type {
  AdjustmentLevel,
  AdjustmentType,
  SavedAdjustment,
  MonthlyDataPoint,
} from "../store/forecastStore";

// Provide a dummy provider so we don't break App.tsx immediately
export function ForecastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const useForecast = useForecastStore;
