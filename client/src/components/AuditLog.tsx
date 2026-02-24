/*
  AuditLog Component — Clean Pharma Analytics
  Seção de histórico de ajustes para auditoria:
  - Mostra todas as edições feitas na previsão (dados REAIS do ForecastContext)
  - Data/hora, usuário, item, valores anteriores/novos
  - Filtro por período, usuário e status
  - Indicadores visuais de impacto (positivo/negativo)
  - Botão REVERTER para cada ajuste
  - Exportação para Excel com múltiplas abas
*/
import { useState, useMemo } from "react";
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Download,
  AlertTriangle,
} from "lucide-react";
import { useForecast } from "@/contexts/ForecastContext";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AuditStatus = "aprovado" | "pendente" | "revertido";

interface AuditEntry {
  id: string;
  timestamp: string;
  usuario: string;
  nivel: string;
  item: string;
  tipoAjuste: string;
  valorAjuste: string;
  previsaoAnterior: number;
  previsaoNova: number;
  diferenca: number;
  percentualImpacto: number;
  status: AuditStatus;
  comentario?: string;
}

const statusConfig: Record<AuditStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  aprovado: { label: "Aprovado", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 },
  pendente: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-50", icon: Clock },
  revertido: { label: "Revertido", color: "text-red-600", bg: "bg-red-50", icon: RotateCcw },
};

export default function AuditLog() {
  const { savedAdjustments, adjustedProducts, revertAdjustment } = useForecast();
  const [expanded, setExpanded] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState("");
  const [filterStatus, setFilterStatus] = useState<AuditStatus | "todos">("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [revertTarget, setRevertTarget] = useState<AuditEntry | null>(null);

  // Convert savedAdjustments to AuditEntry format
  const auditData: AuditEntry[] = useMemo(() => {
    return savedAdjustments.map(adj => {
      const totalAjuste = Object.values(adj.monthlyValues).reduce((sum, val) => sum + val, 0);
      const avgAjuste = totalAjuste / Object.keys(adj.monthlyValues).length;
      const valorAjusteStr = adj.type === "%" 
        ? `${avgAjuste >= 0 ? "+" : ""}${avgAjuste.toFixed(1)}%` 
        : `${avgAjuste >= 0 ? "+" : ""}${avgAjuste.toLocaleString("pt-BR")}`;
      
      return {
        id: adj.id,
        timestamp: new Date(adj.timestamp).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        usuario: adj.usuario,
        nivel: adj.level === "CATEGORIA NÍVEL 3" ? "Categoria Nível 3" : adj.level === "CATEGORIA NÍVEL 4" ? "Categoria Nível 4" : "Produto",
        item: adj.item,
        tipoAjuste: adj.type,
        valorAjuste: valorAjusteStr,
        previsaoAnterior: adj.previsaoOriginal,
        previsaoNova: adj.previsaoAjustada,
        diferenca: adj.previsaoAjustada - adj.previsaoOriginal,
        percentualImpacto: adj.previsaoOriginal > 0 
          ? ((adj.previsaoAjustada - adj.previsaoOriginal) / adj.previsaoOriginal) * 100 
          : 0,
        status: adj.exported ? "aprovado" : "pendente",
        comentario: undefined,
      };
    });
  }, [savedAdjustments]);

  const uniqueUsers = useMemo(() => Array.from(new Set(auditData.map(e => e.usuario))), [auditData]);

  const filteredData = useMemo(() => {
    return auditData.filter(entry => {
      if (filterUser && entry.usuario !== filterUser) return false;
      if (filterStatus !== "todos" && entry.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          entry.item.toLowerCase().includes(term) ||
          entry.usuario.toLowerCase().includes(term) ||
          (entry.comentario && entry.comentario.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [auditData, filterUser, filterStatus, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const total = auditData.length;
    const aprovados = auditData.filter(e => e.status === "aprovado").length;
    const pendentes = auditData.filter(e => e.status === "pendente").length;
    const revertidos = auditData.filter(e => e.status === "revertido").length;
    const impactoTotal = auditData
      .filter(e => e.status === "aprovado" || e.status === "pendente")
      .reduce((sum, e) => sum + e.diferenca, 0);
    return { total, aprovados, pendentes, revertidos, impactoTotal };
  }, [auditData]);

  const handleRevertClick = (entry: AuditEntry) => {
    setRevertTarget(entry);
    setRevertDialogOpen(true);
  };

  const confirmRevert = () => {
    if (!revertTarget) return;
    revertAdjustment(revertTarget.id);
    toast.success(`Ajuste revertido: ${revertTarget.item}`);
    setRevertDialogOpen(false);
    setRevertTarget(null);
  };

  const handleExportExcel = () => {
    if (auditData.length === 0) {
      toast.error("Nenhum ajuste para exportar");
      return;
    }

    // Aba 1: Resumo dos ajustes
    const resumoData = auditData.map(entry => ({
      "Data/Hora": entry.timestamp,
      "Usuário": entry.usuario,
      "Nível": entry.nivel,
      "Item": entry.item,
      "Tipo": entry.tipoAjuste,
      "Ajuste": entry.valorAjuste,
      "Previsão Original": entry.previsaoAnterior,
      "Previsão Ajustada": entry.previsaoNova,
      "Diferença": entry.diferenca,
      "Impacto %": entry.percentualImpacto.toFixed(2) + "%",
      "Status": entry.status,
    }));

    // Aba 2: Produtos afetados
    const produtosData = adjustedProducts
      .filter(p => p.forecast !== p.originalForecast)
      .map(p => ({
        "Código": p.codigo,
        "Nome": p.nome,
        "Categoria N3": p.categoria3,
        "Categoria N4": p.categoria4,
        "Comprador": p.comprador,
        "CD": p.cd,
        "Previsão Original": p.originalForecast,
        "Previsão Ajustada": p.forecast,
        "Diferença": p.forecast - p.originalForecast,
        "Variação %": p.originalForecast > 0 
          ? (((p.forecast - p.originalForecast) / p.originalForecast) * 100).toFixed(2) + "%" 
          : "0%",
      }));

    // Aba 3: Estatísticas
    const estatisticasData = [
      { "Métrica": "Total de Ajustes", "Valor": stats.total },
      { "Métrica": "Aprovados", "Valor": stats.aprovados },
      { "Métrica": "Pendentes", "Valor": stats.pendentes },
      { "Métrica": "Revertidos", "Valor": stats.revertidos },
      { "Métrica": "Impacto Total (unidades)", "Valor": stats.impactoTotal },
      { "Métrica": "Produtos Afetados", "Valor": produtosData.length },
    ];

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumo dos Ajustes");
    
    const ws2 = XLSX.utils.json_to_sheet(produtosData);
    XLSX.utils.book_append_sheet(wb, ws2, "Produtos Afetados");
    
    const ws3 = XLSX.utils.json_to_sheet(estatisticasData);
    XLSX.utils.book_append_sheet(wb, ws3, "Estatísticas");

    // Exportar
    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    XLSX.writeFile(wb, `relatorio-ajustes-${timestamp}.xlsx`);
    
    toast.success("Relatório Excel exportado com sucesso!");
  };

  return (
    <>
      <div className="bg-white border border-border rounded-xl shadow-sm">
        {/* Header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
          className="flex items-center justify-between w-full px-5 py-4 border-b border-border hover:bg-accent/30 transition-colors rounded-t-xl cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0F4C75]/10">
              <History className="w-4 h-4 text-[#0F4C75]" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-foreground">Histórico de Ajustes</h2>
              <p className="text-[11px] text-muted-foreground">
                Log de auditoria · {stats.total} registro(s) · {stats.pendentes} pendente(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Export Excel button */}
            {auditData.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportExcel();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </button>
            )}
            {/* Mini stats badges */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {stats.aprovados}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                <Clock className="w-3 h-3" />
                {stats.pendentes}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
                <RotateCcw className="w-3 h-3" />
                {stats.revertidos}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <>
            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border bg-[#F8FAFC]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por item, usuário ou comentário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg hover:border-[#0F4C75]/30 focus:border-[#0F4C75] focus:ring-1 focus:ring-[#0F4C75]/20 outline-none transition-all bg-white"
                />
              </div>

              {/* User filter */}
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="h-8 px-2.5 text-xs border border-border rounded-lg hover:border-[#0F4C75]/30 focus:border-[#0F4C75] focus:ring-1 focus:ring-[#0F4C75]/20 outline-none transition-all bg-white cursor-pointer"
                >
                  <option value="">Todos os usuários</option>
                  {uniqueUsers.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as AuditStatus | "todos")}
                  className="h-8 px-2.5 text-xs border border-border rounded-lg hover:border-[#0F4C75]/30 focus:border-[#0F4C75] focus:ring-1 focus:ring-[#0F4C75]/20 outline-none transition-all bg-white cursor-pointer"
                >
                  <option value="todos">Todos os status</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="pendente">Pendente</option>
                  <option value="revertido">Revertido</option>
                </select>
              </div>
            </div>

            {/* Impact summary bar */}
            <div className="flex items-center gap-6 px-5 py-2.5 border-b border-border bg-[#0F4C75]/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Impacto Total (Aprovados):</span>
                <span className={`text-xs font-bold tabular-nums ${stats.impactoTotal >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {stats.impactoTotal >= 0 ? "+" : ""}{stats.impactoTotal.toLocaleString("pt-BR")} unidades
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exibindo:</span>
                <span className="text-xs font-semibold text-foreground">{filteredData.length} de {auditData.length}</span>
              </div>
            </div>

            {/* Audit entries */}
            <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
              {filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Nenhum registro encontrado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tente ajustar os filtros de busca.</p>
                </div>
              ) : (
                filteredData.map((entry) => {
                  const isExpanded = expandedRow === entry.id;
                  const StatusIcon = statusConfig[entry.status].icon;
                  const isPositive = entry.diferenca >= 0;

                  return (
                    <div key={entry.id} className="group">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedRow(isExpanded ? null : entry.id); }}
                        className="flex items-center w-full px-5 py-3 hover:bg-accent/30 transition-colors text-left cursor-pointer"
                      >
                        {/* Timestamp & User */}
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                            isPositive ? "bg-emerald-50" : "bg-red-50"
                          }`}>
                            {isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] font-semibold text-foreground tabular-nums">{entry.timestamp}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-medium">{entry.usuario}</span>
                            </div>
                          </div>
                        </div>

                        {/* Item info */}
                        <div className="flex-1 min-w-0 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#0F4C75]/60 uppercase tracking-wider">{entry.nivel}</span>
                          </div>
                          <p className="text-xs font-semibold text-foreground truncate mt-0.5">{entry.item}</p>
                        </div>

                        {/* Adjustment value */}
                        <div className="flex items-center gap-4 min-w-[320px] justify-end">
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold block">Ajuste</span>
                            <span className={`text-xs font-bold ${isPositive ? "text-emerald-700" : "text-red-600"}`}>
                              {entry.valorAjuste}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground block tabular-nums">
                                {entry.previsaoAnterior.toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <div className="text-left">
                              <span className={`text-[11px] font-bold tabular-nums ${isPositive ? "text-emerald-700" : "text-red-600"}`}>
                                {entry.previsaoNova.toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig[entry.status].bg} ${statusConfig[entry.status].color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[entry.status].label}
                          </span>

                          {/* Revert button */}
                          {entry.status !== "revertido" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevertClick(entry);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reverter
                            </button>
                          )}

                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-5 pb-3 pt-0">
                          <div className="ml-11 p-3 bg-[#F8FAFC] rounded-lg border border-border/50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Previsão Anterior</span>
                                <span className="text-sm font-bold text-foreground tabular-nums">{entry.previsaoAnterior.toLocaleString("pt-BR")}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Previsão Nova</span>
                                <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-emerald-700" : "text-red-600"}`}>
                                  {entry.previsaoNova.toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Diferença</span>
                                <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-emerald-700" : "text-red-600"}`}>
                                  {isPositive ? "+" : ""}{entry.diferenca.toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Impacto %</span>
                                <span className={`text-sm font-bold tabular-nums ${isPositive ? "text-emerald-700" : "text-red-600"}`}>
                                  {isPositive ? "+" : ""}{entry.percentualImpacto.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {entry.comentario && (
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Comentário / Justificativa</span>
                                <p className="text-xs text-foreground leading-relaxed">{entry.comentario}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-[#F8FAFC] rounded-b-xl">
              <span className="text-[11px] text-muted-foreground">
                Mostrando <span className="font-semibold text-foreground">{filteredData.length}</span> de <span className="font-semibold text-foreground">{auditData.length}</span> registro(s)
              </span>
              {auditData.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Último ajuste: <span className="font-semibold text-foreground">{auditData[0]?.timestamp}</span>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Revert Confirmation Dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirmar Reversão de Ajuste
            </DialogTitle>
            <DialogDescription>
              Você está prestes a reverter o seguinte ajuste:
            </DialogDescription>
          </DialogHeader>
          {revertTarget && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Item:</span>
                <span className="text-sm font-bold text-foreground">{revertTarget.item}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Ajuste:</span>
                <span className="text-sm font-bold text-foreground">{revertTarget.valorAjuste}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Impacto:</span>
                <span className={`text-sm font-bold ${revertTarget.diferenca >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {revertTarget.diferenca >= 0 ? "+" : ""}{revertTarget.diferenca.toLocaleString("pt-BR")} unidades
                </span>
              </div>
            </div>
          )}
          <DialogDescription className="text-amber-700 font-semibold">
            Esta ação removerá o ajuste e os valores retornarão à previsão original. Esta ação não pode ser desfeita.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmRevert}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reverter Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
