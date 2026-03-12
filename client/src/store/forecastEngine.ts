import { allProducts, catN4CdMonthlyForecast, type Product } from "@/lib/mockData";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";

export type AdjustmentLevel = "CATEGORIA NÍVEL 3" | "CATEGORIA NÍVEL 4" | "PRODUTO";
export type AdjustmentType = "%" | "QTD";

export interface SavedAdjustment {
    id: string;
    level: AdjustmentLevel;
    item: string;
    type: AdjustmentType;
    monthlyValues: Record<string, number>;
    previsaoOriginal: number;
    previsaoAjustada: number;
    timestamp: string;
    usuario: string;
    exported: boolean;
    exportedAt: string | null;
}

export const catN3toN4: Record<string, string[]> = (() => {
    const map: Record<string, Set<string>> = {};
    for (const p of allProducts) {
        if (!map[p.categoria3]) map[p.categoria3] = new Set();
        map[p.categoria3].add(p.categoria4);
    }
    const result: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(map)) result[k] = Array.from(v);
    return result;
})();

export const catN4SkuCounts: Record<string, number> = (() => {
    const sets: Record<string, Set<number>> = {};
    for (const p of allProducts) {
        if (!sets[p.categoria4]) sets[p.categoria4] = new Set();
        sets[p.categoria4].add(p.codigo);
    }
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(sets)) counts[k] = v.size;
    return counts;
})();

export const catN3SkuCounts: Record<string, number> = (() => {
    const sets: Record<string, Set<number>> = {};
    for (const p of allProducts) {
        if (!sets[p.categoria3]) sets[p.categoria3] = new Set();
        sets[p.categoria3].add(p.codigo);
    }
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(sets)) counts[k] = v.size;
    return counts;
})();

export const ALL_FORECAST_MONTHS = DATA_BOUNDARIES.forecastMonths;

export function getCatN4MonthlyForecast(cat: string, month: string): number {
    const cdData = catN4CdMonthlyForecast[cat];
    if (!cdData) return 0;
    let total = 0;
    for (const cd of Object.keys(cdData)) {
        total += cdData[cd]?.[month] || 0;
    }
    return total;
}

export function getCatN4TotalForecast(cat: string, months?: string[]): number {
    const useMonths = months || ALL_FORECAST_MONTHS;
    let total = 0;
    for (const month of useMonths) total += getCatN4MonthlyForecast(cat, month);
    return total;
}

export function getCatN3TotalForecast(cat: string, months?: string[]): number {
    const children = catN3toN4[cat] || [];
    return children.reduce((sum, child) => sum + getCatN4TotalForecast(child, months), 0);
}

export function getCatN3MonthlyForecast(cat: string, month: string): number {
    const children = catN3toN4[cat] || [];
    return children.reduce((sum, child) => sum + getCatN4MonthlyForecast(child, month), 0);
}

const _productCdTotals: Record<string, number> = {};
// O(1) lookup: product by codigo|cd
const _productByCodCd = new Map<string, Product>();
// O(1) lookup: products by codigo
const _productsByCodigo = new Map<number, Product[]>();

for (const p of allProducts) {
    const key = `${p.categoria4}|${p.cd}`;
    _productCdTotals[key] = (_productCdTotals[key] || 0) + p.originalForecast;

    _productByCodCd.set(`${p.codigo}|${p.cd}`, p);

    const existing = _productsByCodigo.get(p.codigo);
    if (existing) existing.push(p);
    else _productsByCodigo.set(p.codigo, [p]);
}

export function getProductMonthlyForecast(codigo: number, cd: string, month: string): number {
    const product = _productByCodCd.get(`${codigo}|${cd}`);
    if (!product) return 0;
    const cdForecast = catN4CdMonthlyForecast[product.categoria4]?.[cd]?.[month] || 0;
    const totalKey = `${product.categoria4}|${cd}`;
    const totalForCatCd = _productCdTotals[totalKey] || 1;
    const weight = product.originalForecast / totalForCatCd;
    return Math.round(cdForecast * weight);
}

export function getProductMonthlyForecastAllCds(codigo: number, month: string): number {
    const products = _productsByCodigo.get(codigo) || [];
    let total = 0;
    for (const p of products) {
        total += getProductMonthlyForecast(p.codigo, p.cd, month);
    }
    return total;
}

export function getProductTotalForecastAllCds(codigo: number, months?: string[]): number {
    const useMonths = months || ALL_FORECAST_MONTHS;
    let total = 0;
    for (const month of useMonths) {
        total += getProductMonthlyForecastAllCds(codigo, month);
    }
    return total;
}

export function calcAdjustmentDeltaForProduct(
    adj: SavedAdjustment,
    product: Product,
    month: string,
    productMonthForecast: number,
): number {
    const monthVal = adj.monthlyValues[month] || 0;
    if (monthVal === 0) return 0;

    if (adj.level === "PRODUTO") {
        const adjCode = parseInt(adj.item.split(" - ")[0]);
        if (adjCode !== product.codigo) return 0;
        return adj.type === "%"
            ? Math.round(productMonthForecast * monthVal / 100)
            : monthVal;
    }

    if (adj.level === "CATEGORIA NÍVEL 4" && adj.item === product.categoria4) {
        if (adj.type === "%") {
            return Math.round(productMonthForecast * monthVal / 100);
        }
        const catMonthTotal = getCatN4MonthlyForecast(product.categoria4, month);
        return catMonthTotal > 0
            ? Math.round(monthVal * (productMonthForecast / catMonthTotal))
            : 0;
    }

    if (adj.level === "CATEGORIA NÍVEL 3") {
        const childCats = catN3toN4[adj.item] || [];
        if (!childCats.includes(product.categoria4)) return 0;
        if (adj.type === "%") {
            return Math.round(productMonthForecast * monthVal / 100);
        }
        const catN3MonthTotal = getCatN3MonthlyForecast(adj.item, month);
        const catN4MonthTotal = getCatN4MonthlyForecast(product.categoria4, month);
        const catWeight = catN3MonthTotal > 0 ? catN4MonthTotal / catN3MonthTotal : 1 / childCats.length;
        return catN4MonthTotal > 0
            ? Math.round(monthVal * catWeight * (productMonthForecast / catN4MonthTotal))
            : 0;
    }

    return 0;
}

export function computeDerivedState(savedAdjustments: SavedAdjustment[]) {
    const hasAdjustments = savedAdjustments.length > 0;
    const totalImpact = savedAdjustments.reduce((sum, adj) => sum + (adj.previsaoAjustada - adj.previsaoOriginal), 0);
    const categoriasEditadas = Array.from(new Set(savedAdjustments.map(a => a.item))).length;
    const pendingExportCount = savedAdjustments.filter(a => !a.exported).length;
    const exportedCount = savedAdjustments.filter(a => a.exported).length;

    let monthlyAdjustmentMap: Record<string, Record<string, number>> | null = null;
    if (savedAdjustments.length > 0) {
        monthlyAdjustmentMap = {};
        for (const adj of savedAdjustments) {
            if (adj.level === "CATEGORIA NÍVEL 4") {
                if (!monthlyAdjustmentMap[adj.item]) monthlyAdjustmentMap[adj.item] = {};
                for (const month of ALL_FORECAST_MONTHS) {
                    const val = adj.monthlyValues[month] || 0;
                    if (val === 0) continue;
                    const current = monthlyAdjustmentMap[adj.item][month] ?? 1;
                    if (adj.type === "%") {
                        monthlyAdjustmentMap[adj.item][month] = current * (1 + val / 100);
                    } else {
                        const monthForecast = getCatN4MonthlyForecast(adj.item, month);
                        if (monthForecast > 0) {
                            const skuCount = catN4SkuCounts[adj.item] || 1;
                            monthlyAdjustmentMap[adj.item][month] = current + (val / skuCount) / monthForecast * skuCount;
                        }
                    }
                }
            } else if (adj.level === "CATEGORIA NÍVEL 3") {
                const childCats = catN3toN4[adj.item] || [];
                for (const childCat of childCats) {
                    if (!monthlyAdjustmentMap[childCat]) monthlyAdjustmentMap[childCat] = {};
                    for (const month of ALL_FORECAST_MONTHS) {
                        const val = adj.monthlyValues[month] || 0;
                        if (val === 0) continue;
                        const current = monthlyAdjustmentMap[childCat][month] ?? 1;
                        if (adj.type === "%") {
                            monthlyAdjustmentMap[childCat][month] = current * (1 + val / 100);
                        } else {
                            const catN3Total = getCatN3MonthlyForecast(adj.item, month);
                            const catN4Total = getCatN4MonthlyForecast(childCat, month);
                            const catWeight = catN3Total > 0 ? catN4Total / catN3Total : 1 / childCats.length;
                            if (catN4Total > 0) {
                                monthlyAdjustmentMap[childCat][month] = current + (val * catWeight) / catN4Total;
                            }
                        }
                    }
                }
            }
        }
    }

    let adjustedProducts = allProducts;
    if (savedAdjustments.length > 0) {
        adjustedProducts = allProducts.map(product => {
            let adjustedForecast = product.originalForecast;
            for (const adj of savedAdjustments) {
                let totalDelta = 0;
                for (const month of ALL_FORECAST_MONTHS) {
                    const productMonthForecast = getProductMonthlyForecast(product.codigo, product.cd, month);
                    totalDelta += calcAdjustmentDeltaForProduct(adj, product, month, productMonthForecast);
                }
                adjustedForecast += totalDelta;
            }
            return { ...product, forecast: Math.max(0, Math.round(adjustedForecast)) };
        });
    }

    return {
        hasAdjustments,
        totalImpact,
        categoriasEditadas,
        pendingExportCount,
        exportedCount,
        monthlyAdjustmentMap,
        adjustedProducts,
    };
}
