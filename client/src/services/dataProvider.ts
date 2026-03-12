/**
 * Data Provider
 *
 * Camada de abstração centralizada para acesso a dados.
 * Atualmente: importa de mockData, dataBoundaries e dataDerived (local).
 * Migração para API: substituir os imports por chamadas assíncronas via apiClient.
 *
 * Quando a API estiver pronta:
 * 1. Implementar initializeData() para carregar da API
 * 2. Converter exports estáticos para getters que retornam dados carregados
 * 3. Chamar initializeData() no main.tsx antes de renderizar a app
 */

// ============================================================
// Re-exports de mockData (fonte de dados atual)
// ============================================================
export {
  allProducts,
  sampleProducts,
  catN4CdMonthlyForecast,
  catN4CdMonthlyHistorico,
  catN4CdMonthlyQtdBruta,
  cdMonthlyData,
  categoriesNivel3,
  categoriesNivel4,
  centrosDistribuicao,
  compradores,
  fornecedores,
} from "@/lib/mockData";

export type { Product, ComparisonRow } from "@/types/domain";

// ============================================================
// Re-exports de dataBoundaries
// ============================================================
export { DATA_BOUNDARIES } from "@/lib/dataBoundaries";

// ============================================================
// Re-exports de dataDerived
// ============================================================
export { monthlyData, comparisonData } from "@/lib/dataDerived";

// ============================================================
// Inicialização (preparação para API)
// ============================================================

/**
 * Inicializa os dados da aplicação.
 * Atualmente: no-op (dados são importados estaticamente de mockData).
 * Futuramente: carrega dados da API e popula o estado interno.
 *
 * Deve ser chamada no main.tsx antes de React.render().
 */
export async function initializeData(): Promise<void> {
  // Atualmente: dados já estão disponíveis via imports estáticos
  // Futuramente:
  //   const products = await apiClient.get<ProductsResponse>("/products");
  //   const forecast = await apiClient.get<CategoryForecastResponse>("/forecast/categories");
  //   const filters = await apiClient.get<FilterOptionsResponse>("/filters/options");
  //   ... populate internal state ...
}
