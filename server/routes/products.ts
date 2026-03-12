/**
 * Products API Routes
 *
 * Endpoints para dados de produtos.
 * Implementação inicial: retorna dados estáticos (placeholder).
 * Quando o banco de dados estiver configurado, substituir pelos queries reais.
 */
import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * GET /api/products
 * Retorna lista de produtos com suporte a filtros e paginação.
 *
 * Query params:
 *   - page (number, default 1)
 *   - pageSize (number, default 50)
 *   - search (string, busca por código ou nome)
 *   - categoriaN3 (string[], filtro por categoria N3)
 *   - categoriaN4 (string[], filtro por categoria N4)
 *   - comprador (string[], filtro por comprador)
 *   - fornecedor (string[], filtro por fornecedor)
 *   - cd (string[], filtro por centro de distribuição)
 */
router.get("/", (_req: Request, res: Response) => {
  // Placeholder: será implementado com dados reais do banco
  res.json({
    products: [],
    total: 0,
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

export default router;
