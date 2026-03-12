/**
 * Service Configuration
 *
 * Configurações centralizadas para os services da aplicação.
 * Controla se os services usam dados locais (mock/localStorage) ou API real.
 *
 * Para ativar modo API, defina no .env:
 *   VITE_USE_API=true
 *   VITE_API_URL=https://sua-api.com/api
 */

export const USE_API = import.meta.env.VITE_USE_API === "true";
export const API_URL = import.meta.env.VITE_API_URL || "/api";
