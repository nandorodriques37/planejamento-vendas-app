/**
 * Constantes compartilhadas da aplicação
 */

/** Nome do usuário padrão (mockup — será substituído por autenticação) */
export const DEFAULT_USER = "THATYANNE";

/** Meses em português (abreviados) */
export const MONTHS_PT: string[] = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Mapeamento mês abreviado → índice (0-based) para ordenação */
export const MONTHS_PT_SORT: Record<string, number> = {
  Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5,
  Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11,
};

/** Mapeamento mês abreviado → número (1-based) para conversão */
export const MONTHS_PT_NUMBER: Record<string, number> = {
  Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
  Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12,
};
