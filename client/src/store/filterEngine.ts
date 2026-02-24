import { type Product } from "@/lib/mockData";
import { comparisonData, monthlyData, type ComparisonRow } from "@/lib/dataDerived";
import { catN4CdMonthlyForecast, catN4CdMonthlyHistorico, catN4CdMonthlyQtdBruta } from "@/lib/mockData";
import { monthYearToNumeric } from "@/lib/dateUtils";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";
import { type FilterState, type FilteredMonthlyPoint } from "./filterStore";

const historicalMonths = DATA_BOUNDARIES.historicalMonths;
const forecastMonths = DATA_BOUNDARIES.forecastMonths;
const allMonths = DATA_BOUNDARIES.allMonths;

export function toHistoricoKey(month: string): string {
    return monthYearToNumeric(month);
}

export function cdToNumber(cd: string): number {
    return parseInt(cd.replace(/\D/g, ""), 10);
}

export function hasSelection(arr: string[]): boolean {
    return arr.length > 0;
}

export function matchesFilter(value: string, filter: string[]): boolean {
    return filter.length === 0 || filter.includes(value);
}

export function computeDerivedState(
    appliedFilters: FilterState,
    products: Product[],
    hasAdjustedForecast: boolean,
    monthlyAdjustmentMap: Record<string, Record<string, number>> | null
) {
    const getRatio = (catN4: string, cd: string, month: string) => {
        if (!monthlyAdjustmentMap) return 1;
        return monthlyAdjustmentMap[catN4]?.[month] ?? 1;
    };

    const isFiltered =
        appliedFilters.codigoProduto !== "" ||
        hasSelection(appliedFilters.categoriaN3) ||
        hasSelection(appliedFilters.categoriaN4) ||
        hasSelection(appliedFilters.centroDistribuicao) ||
        hasSelection(appliedFilters.comprador) ||
        hasSelection(appliedFilters.fornecedor);

    const filteredProducts = products.filter(p => {
        if (appliedFilters.codigoProduto) {
            const search = appliedFilters.codigoProduto.toLowerCase();
            if (!String(p.codigo).includes(search) && !p.nome.toLowerCase().includes(search)) return false;
        }
        if (!matchesFilter(p.categoria3, appliedFilters.categoriaN3)) return false;
        if (!matchesFilter(p.categoria4, appliedFilters.categoriaN4)) return false;
        if (!matchesFilter(p.cd, appliedFilters.centroDistribuicao)) return false;
        if (!matchesFilter(p.comprador, appliedFilters.comprador)) return false;
        if (!matchesFilter(p.fornecedor, appliedFilters.fornecedor)) return false;
        return true;
    });

    const activeCds = isFiltered
        ? Array.from(new Set(filteredProducts.map(p => p.cd)))
        : Array.from(new Set(products.map(p => p.cd)));

    const activeCatN4s = isFiltered
        ? Array.from(new Set(filteredProducts.map(p => p.categoria4)))
        : (() => {
            const allCats = new Set<string>();
            for (const cat of Object.keys(catN4CdMonthlyHistorico)) allCats.add(cat);
            for (const cat of Object.keys(catN4CdMonthlyForecast)) allCats.add(cat);
            return Array.from(allCats);
        })();

    const filteredComparison = isFiltered
        ? comparisonData.filter(row => activeCatN4s.includes(row.categoria)).sort((a, b) => (b.mes0 ?? 0) - (a.mes0 ?? 0))
        : [...comparisonData].sort((a, b) => (b.mes0 ?? 0) - (a.mes0 ?? 0));

    let filteredMonthlyData: FilteredMonthlyPoint[] = [];

    const useProductLevelAggregation = hasSelection(appliedFilters.fornecedor) || appliedFilters.codigoProduto !== "";

    if (useProductLevelAggregation && isFiltered) {
        const cdNumbers = activeCds.map(cd => cdToNumber(cd));
        const cdStrings = activeCds;
        const catArr = activeCatN4s;

        const catCdProportions = new Map<string, number>();
        for (const cat of catArr) {
            for (const cd of cdStrings) {
                const totalInCatCd = products.filter(p => p.categoria4 === cat && p.cd === cd).reduce((sum, p) => sum + p.forecast, 0);
                const filteredInCatCd = filteredProducts.filter(p => p.categoria4 === cat && p.cd === cd).reduce((sum, p) => sum + p.forecast, 0);
                const proportion = totalInCatCd > 0 ? filteredInCatCd / totalInCatCd : 0;
                catCdProportions.set(`${cat}|${cd}`, proportion);
            }
        }

        filteredMonthlyData = allMonths.map(month => {
            const isHistoricalMonth = historicalMonths.includes(month);
            const isForecastMonth = forecastMonths.includes(month);

            let historico = 0;
            let hasHistorico = false;
            if (isHistoricalMonth) {
                const historicoKey = toHistoricoKey(month);
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < cdNumbers.length; d++) {
                        const val = catN4CdMonthlyHistorico[catArr[c]]?.[cdNumbers[d]]?.[historicoKey];
                        if (val !== undefined && val !== null) {
                            const proportion = catCdProportions.get(`${catArr[c]}|${cdStrings[d]}`) || 0;
                            historico += val * proportion;
                            hasHistorico = true;
                        }
                    }
                }
            }

            let qtdBruta = 0;
            let hasQtdBruta = false;
            if (isHistoricalMonth) {
                const qtdBrutaKey = toHistoricoKey(month);
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < cdNumbers.length; d++) {
                        const val = catN4CdMonthlyQtdBruta[catArr[c]]?.[cdNumbers[d]]?.[qtdBrutaKey];
                        if (val !== undefined && val !== null) {
                            const proportion = catCdProportions.get(`${catArr[c]}|${cdStrings[d]}`) || 0;
                            qtdBruta += val * proportion;
                            hasQtdBruta = true;
                        }
                    }
                }
            }

            let previsao: number | null = null;
            let hasPrevisao = false;
            if (isForecastMonth) {
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < cdStrings.length; d++) {
                        const val = catN4CdMonthlyForecast[catArr[c]]?.[cdStrings[d]]?.[month];
                        if (val !== undefined && val !== null) {
                            const proportion = catCdProportions.get(`${catArr[c]}|${cdStrings[d]}`) || 0;
                            previsao = (previsao || 0) + (val * proportion);
                            hasPrevisao = true;
                        }
                    }
                }
            }

            let totalWeightedRatio = 0;
            let totalWeight = 0;
            if (hasPrevisao && previsao !== null && hasAdjustedForecast && isForecastMonth) {
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < cdStrings.length; d++) {
                        const val = catN4CdMonthlyForecast[catArr[c]]?.[cdStrings[d]]?.[month];
                        if (val !== undefined && val !== null && val > 0) {
                            const ratio = getRatio(catArr[c], cdStrings[d], month);
                            totalWeightedRatio += val * ratio;
                            totalWeight += val;
                        }
                    }
                }
            }
            const avgRatio = totalWeight > 0 ? totalWeightedRatio / totalWeight : 1;
            const previsaoAjustada = hasPrevisao && previsao !== null && hasAdjustedForecast
                ? Math.round(previsao * avgRatio)
                : null;

            return {
                month,
                historico: isHistoricalMonth && hasHistorico ? Math.round(historico) : null,
                qtdBruta: isHistoricalMonth && hasQtdBruta ? Math.round(qtdBruta) : null,
                previsao: hasPrevisao && previsao !== null ? Math.round(previsao) : null,
                previsaoAjustada,
            };
        });
    } else if (!isFiltered) {
        filteredMonthlyData = monthlyData.map(d => {
            let previsaoAjustada: number | null = null;
            if (d.previsao !== null && hasAdjustedForecast) {
                let total = 0;
                for (const cat of Object.keys(catN4CdMonthlyForecast)) {
                    const cdData = catN4CdMonthlyForecast[cat];
                    if (!cdData) continue;
                    for (const cd of Object.keys(cdData)) {
                        const origVal = cdData[cd]?.[d.month] || 0;
                        const ratio = getRatio(cat, cd, d.month);
                        total += origVal * ratio;
                    }
                }
                previsaoAjustada = Math.round(total);
            }
            return {
                month: d.month,
                historico: d.historico,
                qtdBruta: d.qtdBruta,
                previsao: d.previsao,
                previsaoAjustada,
            };
        });
    } else {
        const cdNumbers = activeCds.map(cd => cdToNumber(cd));
        const catArr = activeCatN4s;

        filteredMonthlyData = allMonths.map(month => {
            const isHistoricalMonth = historicalMonths.includes(month);
            const isForecastMonth = forecastMonths.includes(month);

            let historico = 0;
            let hasHistorico = false;
            if (isHistoricalMonth) {
                const historicoKey = toHistoricoKey(month);
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < cdNumbers.length; d++) {
                        const val = catN4CdMonthlyHistorico[catArr[c]]?.[cdNumbers[d]]?.[historicoKey];
                        if (val !== undefined && val !== null) {
                            historico += val;
                            hasHistorico = true;
                        }
                    }
                }
            }

            let qtdBruta = 0;
            let hasQtdBruta = false;
            if (isHistoricalMonth) {
                const qtdBrutaKey = toHistoricoKey(month);
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < cdNumbers.length; d++) {
                        const val = catN4CdMonthlyQtdBruta[catArr[c]]?.[cdNumbers[d]]?.[qtdBrutaKey];
                        if (val !== undefined && val !== null) {
                            qtdBruta += val;
                            hasQtdBruta = true;
                        }
                    }
                }
            }

            let previsao = 0;
            let hasForecast = false;
            if (isForecastMonth) {
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < activeCds.length; d++) {
                        const val = catN4CdMonthlyForecast[catArr[c]]?.[activeCds[d]]?.[month];
                        if (val !== undefined && val !== null) {
                            previsao += val;
                            hasForecast = true;
                        }
                    }
                }
            }

            let previsaoAjustada: number | null = null;
            if (isForecastMonth && hasForecast && hasAdjustedForecast) {
                let total = 0;
                for (let c = 0; c < catArr.length; c++) {
                    for (let d = 0; d < activeCds.length; d++) {
                        const origVal = catN4CdMonthlyForecast[catArr[c]]?.[activeCds[d]]?.[month] || 0;
                        const ratio = getRatio(catArr[c], activeCds[d], month);
                        total += origVal * ratio;
                    }
                }
                previsaoAjustada = Math.round(total);
            }

            return {
                month,
                historico: isHistoricalMonth && hasHistorico ? Math.round(historico) : null,
                qtdBruta: isHistoricalMonth && hasQtdBruta ? Math.round(qtdBruta) : null,
                previsao: hasForecast ? Math.round(previsao) : null,
                previsaoAjustada,
            };
        });
    }

    return {
        isFiltered,
        filteredProducts,
        activeCds,
        activeCatN4s,
        filteredComparison,
        filteredMonthlyData,
    };
}
