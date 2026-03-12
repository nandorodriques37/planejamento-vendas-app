/**
 * Filter Service
 *
 * Abstrai o acesso às opções de filtro disponíveis.
 * Implementação atual: retorna dados de mockData.ts (local).
 * Migração para API: substituir por chamadas ao apiClient.
 */
import {
  categoriesNivel3,
  categoriesNivel4,
  centrosDistribuicao,
  compradores,
  fornecedores,
  sampleProducts,
} from "@/lib/mockData";
import type { FilterOptionsResponse } from "@/types/api";

/**
 * Retorna todas as opções de filtro disponíveis.
 * Futuramente: GET /api/filters/options
 */
export async function getFilterOptions(): Promise<FilterOptionsResponse> {
  return {
    categoriasN3: categoriesNivel3,
    categoriasN4: categoriesNivel4,
    compradores,
    fornecedores,
    centrosDistribuicao,
    produtos: sampleProducts.map(p => ({ codigo: p.codigo, nome: p.nome })),
  };
}
