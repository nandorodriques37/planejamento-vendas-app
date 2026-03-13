import { computeDerivedState } from "./filterEngine";
import type { FilterState } from "./filterStore";
import type { Product } from "@/types/domain";

self.onmessage = (e: MessageEvent<{
    appliedFilters: FilterState,
    products: Product[],
    hasAdjustedForecast: boolean,
    monthlyAdjustmentMap: Record<string, Record<string, number>> | null
}>) => {
    const { appliedFilters, products, hasAdjustedForecast, monthlyAdjustmentMap } = e.data;
    const result = computeDerivedState(appliedFilters, products, hasAdjustedForecast, monthlyAdjustmentMap);
    self.postMessage(result);
};
