/**
 * Adjustments API Routes
 *
 * Endpoints para gerenciamento de ajustes colaborativos.
 * Implementação inicial: retorna dados estáticos (placeholder).
 * Quando o banco de dados estiver configurado, substituir pelos queries reais.
 */
import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * GET /api/adjustments
 * Retorna todos os ajustes salvos.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    adjustments: [],
    pendingCount: 0,
    exportedCount: 0,
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

/**
 * POST /api/adjustments
 * Salva novos ajustes.
 *
 * Body: { adjustments: SavedAdjustment[] }
 */
router.post("/", (req: Request, res: Response) => {
  const { adjustments } = req.body || {};
  if (!adjustments || !Array.isArray(adjustments)) {
    res.status(400).json({
      message: "Campo 'adjustments' é obrigatório e deve ser um array.",
      code: "INVALID_REQUEST",
      status: 400,
    });
    return;
  }

  // Placeholder: persistir no banco de dados
  res.json({
    success: true,
    ids: adjustments.map((a: any) => a.id),
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/adjustments/:id
 * Remove um ajuste pelo ID.
 */
router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  // Placeholder: remover do banco de dados
  res.json({ success: true });
});

/**
 * DELETE /api/adjustments
 * Limpa todos os ajustes.
 */
router.delete("/", (_req: Request, res: Response) => {
  // Placeholder: limpar tabela de ajustes
  res.json({ success: true });
});

/**
 * PATCH /api/adjustments/mark-exported
 * Marca ajustes como exportados.
 *
 * Body: { ids: string[] }
 */
router.patch("/mark-exported", (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (!ids || !Array.isArray(ids)) {
    res.status(400).json({
      message: "Campo 'ids' é obrigatório e deve ser um array.",
      code: "INVALID_REQUEST",
      status: 400,
    });
    return;
  }

  res.json({
    success: true,
    ids,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/adjustments/export
 * Exporta ajustes pendentes.
 *
 * Body: { format: "json" | "excel" | "pdf" }
 */
router.post("/export", (_req: Request, res: Response) => {
  res.json({
    json: "{}",
    exportedIds: [],
    message: "Endpoint preparado. Conectar ao banco de dados para dados reais.",
  });
});

export default router;
