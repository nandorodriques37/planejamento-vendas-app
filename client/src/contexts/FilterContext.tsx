import { ReactNode } from "react";
import { type Product } from "@/lib/mockData";
import { useFilterStore } from "../store/filterStore";

export type { FilterState, FilteredMonthlyPoint } from "../store/filterStore";

// Provide a dummy provider so we don't break App.tsx immediately
export function FilterProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const useFilters = useFilterStore;
