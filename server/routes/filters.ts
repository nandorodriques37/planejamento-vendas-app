/**
 * Filters API Routes
 *
 * Endpoints para opções de filtros disponíveis.
 * Implementação inicial: retorna dados estáticos (placeholder).
 * Quando o banco de dados estiver configurado, substituir pelos queries reais.
 */
import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * GET /api/filters/options
 * Retorna todas as opções de filtro disponíveis (categorias, compradores, etc).
 */
router.get("/options", (_req: Request, res: Response) => {
  res.json({
    categoriasN3: [],
    categoriasN4: [],
    compradores: [],
    fornecedores: [],
    centrosDistribuicao: [],
    produtos: [],
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

export default router;
