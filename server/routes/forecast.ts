/**
 * Forecast API Routes
 *
 * Endpoints para dados de previsão e histórico.
 * Implementação inicial: retorna dados estáticos (placeholder).
 * Quando o banco de dados estiver configurado, substituir pelos queries reais.
 */
import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * GET /api/forecast/monthly
 * Retorna dados mensais agregados (histórico + previsão).
 */
router.get("/monthly", (_req: Request, res: Response) => {
  res.json({
    data: [],
    boundaries: null,
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

/**
 * GET /api/forecast/categories
 * Retorna dados de forecast por categoria/CD/mês.
 */
router.get("/categories", (_req: Request, res: Response) => {
  res.json({
    forecast: {},
    historico: {},
    qtdBruta: {},
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

/**
 * GET /api/forecast/comparison
 * Retorna dados de comparação por categoria N4.
 */
router.get("/comparison", (_req: Request, res: Response) => {
  res.json({
    data: [],
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

/**
 * GET /api/forecast/cd-monthly
 * Retorna dados mensais por centro de distribuição.
 */
router.get("/cd-monthly", (_req: Request, res: Response) => {
  res.json({
    data: {},
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

export default router;
