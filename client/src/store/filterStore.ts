import { create } from "zustand";
import { allProducts as originalProducts } from "@/services/dataProvider";
import type { Product, ComparisonRow } from "@/types/domain";
import { useForecastStore } from "./forecastStore";
import { computeDerivedState } from "./filterEngine";
import FilterWorker from "./filterWorker?worker";

export interface FilterState {
    codigoProduto: string;
    categoriaN3: string[];
    categoriaN4: string[];
    centroDistribuicao: string[];
    comprador: string[];
    fornecedor: string[];
}

const emptyFilters: FilterState = {
    codigoProduto: "",
    categoriaN3: [],
    categoriaN4: [],
    centroDistribuicao: [],
    fornecedor: [],
    comprador: [],
};

export interface FilteredMonthlyPoint {
    month: string;
    historico: number | null;
    qtdBruta: number | null;
    previsao: number | null;
    previsaoAjustada: number | null;
}

interface FilterStoreType {
    filters: FilterState;
    appliedFilters: FilterState;
    isFiltered: boolean;
    hasAdjustedForecast: boolean;
    filteredProducts: Product[];
    activeCds: string[];
    activeCatN4s: string[];
    filteredComparison: ComparisonRow[];
    filteredMonthlyData: FilteredMonthlyPoint[];
    isCalculating: boolean;

    setFilter: (key: keyof FilterState, value: string | string[]) => void;
    applyFilters: () => void;
    clearFilters: () => void;

    // Method to sync with external forecast store
    syncWithForecast: (products: Product[], hasAdjustments: boolean, monthlyAdjustmentMap: Record<string, Record<string, number>> | null) => void;
}

const initialP = originalProducts;
const initDerived = computeDerivedState(emptyFilters, initialP, false, null);

const worker = new FilterWorker();

export const useFilterStore = create<FilterStoreType>()((set, get) => {
    worker.onmessage = (e) => {
        set({
            isCalculating: false,
            ...e.data
        });
    };

    worker.onerror = (e) => {
        console.error("[FilterWorker] Error:", e.message);
        set({ isCalculating: false });
    };

    return {
        filters: emptyFilters,
        appliedFilters: emptyFilters,
        hasAdjustedForecast: false,
        ...initDerived,
        isCalculating: false,

        setFilter: (key, value) => {
            set(state => ({ filters: { ...state.filters, [key]: value } }));
        },

        applyFilters: () => {
            const { filters } = get();
            set({ appliedFilters: { ...filters }, isCalculating: true });

            const forecastState = useForecastStore.getState();
            worker.postMessage({
                appliedFilters: filters,
                products: forecastState.adjustedProducts,
                hasAdjustedForecast: forecastState.hasAdjustments,
                monthlyAdjustmentMap: forecastState.monthlyAdjustmentMap
            });
        },

        clearFilters: () => {
            set({ filters: emptyFilters, appliedFilters: emptyFilters, isCalculating: true });
            const forecastState = useForecastStore.getState();
            worker.postMessage({
                appliedFilters: emptyFilters,
                products: forecastState.adjustedProducts,
                hasAdjustedForecast: forecastState.hasAdjustments,
                monthlyAdjustmentMap: forecastState.monthlyAdjustmentMap
            });
        },

        syncWithForecast: (products, hasAdjustments, monthlyAdjustmentMap) => {
            const { appliedFilters } = get();
            set({ hasAdjustedForecast: hasAdjustments, isCalculating: true });
            worker.postMessage({
                appliedFilters,
                products,
                hasAdjustedForecast: hasAdjustments,
                monthlyAdjustmentMap
            });
        }
    };
});

// Debounce sync to avoid redundant worker calls during batch operations
let _syncTimer: ReturnType<typeof setTimeout> | null = null;

useForecastStore.subscribe((state, prevState) => {
    const currProducts = state.adjustedProducts;
    const prevProducts = prevState.adjustedProducts;
    const currHasAdj = state.hasAdjustments;
    const prevHasAdj = prevState.hasAdjustments;
    const currMap = state.monthlyAdjustmentMap;
    const prevMap = prevState.monthlyAdjustmentMap;

    if (currProducts !== prevProducts || currHasAdj !== prevHasAdj || currMap !== prevMap) {
        if (_syncTimer) clearTimeout(_syncTimer);
        _syncTimer = setTimeout(() => {
            useFilterStore.getState().syncWithForecast(
                state.adjustedProducts,
                state.hasAdjustments,
                state.monthlyAdjustmentMap
            );
            _syncTimer = null;
        }, 100);
    }
});
