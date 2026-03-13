/*
  AdjustmentTable Component — Clean Pharma Analytics
  Tabela de ajustes colaborativos com:
  - Escolha de nível: Categoria Nível 3, Categoria Nível 4, ou Produto
  - Tipo de ajuste: % ou Quantidade
  - COLUNAS MÊS A MÊS: cada mês do período selecionado tem sua própria coluna
  - Cálculo automático da previsão ajustada por mês e total
  - Redistribuição proporcional ao salvar (via ForecastContext)
  - Bloqueio de duplicatas
  - Controle de exportação para evitar duplicidade no datalake
*/
import { useState, useMemo, useRef, useCallback } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Plus, Trash2, Save, ChevronDown, AlertCircle, Sliders, GitBranch, Package, Download, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { categoriesNivel3, categoriesNivel4, sampleProducts } from "@/services/dataProvider";
import { useForecast, type AdjustmentLevel, type AdjustmentType, type SavedAdjustment } from "@/contexts/ForecastContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useShallow } from "zustand/react/shallow";
import { DEFAULT_USER } from "@/lib/constants";
import { calculateMonthlyAdjusted } from "@/lib/forecastUtils";
import { toast } from "sonner";

interface AdjustmentRow {
  id: string;
  level: AdjustmentLevel;
  item: string;
  type: AdjustmentType;
  // Valores mês a mês: chave = mês (ex: "Fev/26"), valor = ajuste daquele mês
  monthlyValues: Record<string, number | string>;
}

function getItemOptions(level: AdjustmentLevel): string[] {
  switch (level) {
    case "CATEGORIA NÍVEL 3":
      return categoriesNivel3;
    case "CATEGORIA NÍVEL 4":
      return categoriesNivel4;
    case "PRODUTO":
      return sampleProducts.map(p => `${p.codigo} - ${p.nome}`);
    default:
      return [];
  }
}

export default function AdjustmentTable() {
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSave, setPendingSave] = useState<SavedAdjustment[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const { saveAdjustments, getMonthlyForecastForItem, getSkuCountForItem, savedAdjustments, catN3toN4, hasAdjustments, exportAdjustments, markAsExported, pendingExportCount, exportedCount } = useForecast(useShallow(state => ({
    saveAdjustments: state.saveAdjustments,
    getMonthlyForecastForItem: state.getMonthlyForecastForItem,
    getSkuCountForItem: state.getSkuCountForItem,
    savedAdjustments: state.savedAdjustments,
    catN3toN4: state.catN3toN4,
    hasAdjustments: state.hasAdjustments,
    exportAdjustments: state.exportAdjustments,
    markAsExported: state.markAsExported,
    pendingExportCount: state.pendingExportCount,
    exportedCount: state.exportedCount
  })));
  const { activeMonths } = usePeriod();

  const usedItems = useMemo(() => new Set(rows.map(r => r.item)), [rows]);

  // Close dropdown when clicking outside
  useClickOutside(tableRef, useCallback(() => setOpenDropdown(null), []));

  const addRow = useCallback(() => {
    const monthlyValues: Record<string, number | string> = {};
    for (const m of activeMonths) {
      monthlyValues[m] = "";
    }
    const newRow: AdjustmentRow = {
      id: crypto.randomUUID(),
      level: "CATEGORIA NÍVEL 4",
      item: "",
      type: "%",
      monthlyValues,
    };
    setRows(prev => [...prev, newRow]);
  }, [activeMonths]);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const updateRow = useCallback((id: string, field: keyof AdjustmentRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };

      // Reset item when level changes
      if (field === "level") {
        updated.item = "";
        const monthlyValues: Record<string, number | string> = {};
        for (const m of activeMonths) {
          monthlyValues[m] = "";
        }
        updated.monthlyValues = monthlyValues;
      }

      // Reset monthly values when item changes
      if (field === "item") {
        const monthlyValues: Record<string, number | string> = {};
        for (const m of activeMonths) {
          monthlyValues[m] = "";
        }
        updated.monthlyValues = monthlyValues;
      }

      return updated;
    }));
  }, [activeMonths]);

  const updateMonthlyValue = useCallback((id: string, month: string, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        monthlyValues: { ...r.monthlyValues, [month]: value },
      };
    }));
  }, []);

  // Apply same value to all months
  const applyToAllMonths = useCallback((id: string, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const monthlyValues: Record<string, number | string> = {};
      for (const m of activeMonths) {
        monthlyValues[m] = value;
      }
      return { ...r, monthlyValues };
    }));
  }, [activeMonths]);

  // Calculate totals for a row
  function getRowTotals(row: AdjustmentRow) {
    if (!row.item) return { original: 0, adjusted: 0, diff: 0 };

    let totalOriginal = 0;
    let totalAdjusted = 0;

    for (const month of activeMonths) {
      const monthForecast = getMonthlyForecastForItem(row.level, row.item, month);
      totalOriginal += monthForecast;

      const rawVal = row.monthlyValues[month];
      const numVal = typeof rawVal === "string" ? parseFloat(rawVal) || 0 : rawVal;

      if (numVal !== 0) {
        totalAdjusted += calculateMonthlyAdjusted(monthForecast, row.type, numVal);
      } else {
        totalAdjusted += monthForecast;
      }
    }

    return {
      original: totalOriginal,
      adjusted: totalAdjusted,
      diff: totalAdjusted - totalOriginal,
    };
  }

  function handleSave() {
    const validRows = rows.filter(r => {
      if (!r.item) return false;
      // At least one month must have a non-zero value
      return Object.values(r.monthlyValues).some(v => {
        const num = typeof v === "string" ? parseFloat(v) || 0 : v;
        return num !== 0;
      });
    });

    if (validRows.length === 0) {
      toast.error("Nenhum ajuste válido para salvar. Preencha ao menos um mês com valor.");
      return;
    }

    const now = new Date();
    const timestamp = `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const newAdjustments: SavedAdjustment[] = validRows.map(r => {
      const totals = getRowTotals(r);

      // Convert monthlyValues to numbers
      const cleanMonthlyValues: Record<string, number> = {};
      for (const month of activeMonths) {
        const raw = r.monthlyValues[month];
        cleanMonthlyValues[month] = typeof raw === "string" ? parseFloat(raw) || 0 : raw;
      }

      return {
        id: crypto.randomUUID(),
        level: r.level,
        item: r.item,
        type: r.type,
        monthlyValues: cleanMonthlyValues,
        previsaoOriginal: totals.original,
        previsaoAjustada: totals.adjusted,
        timestamp,
        usuario: DEFAULT_USER,
        exported: false,
        exportedAt: null,
      };
    });

    // Show confirmation modal with summary
    setPendingSave(newAdjustments);
    setShowConfirmModal(true);
  }

  function confirmSave() {
    saveAdjustments(pendingSave);
    const validRows = rows.filter(r => {
      if (!r.item) return false;
      return Object.values(r.monthlyValues).some(v => {
        const num = typeof v === "string" ? parseFloat(v) || 0 : v;
        return num !== 0;
      });
    });

    const redistribInfo = validRows.map(r => {
      if (r.level === "CATEGORIA NÍVEL 3") {
        const children = catN3toN4[r.item] || [];
        return `${r.item}: redistribuído entre ${children.length} subcategoria(s)`;
      } else if (r.level === "CATEGORIA NÍVEL 4") {
        return `${r.item}: redistribuído entre os SKUs da categoria`;
      } else {
        return `${r.item.split(" - ")[0]}: ajuste direto no SKU`;
      }
    });

    toast.success(`${validRows.length} ajuste(s) salvo(s) com valores mês a mês!`, {
      description: redistribInfo.join(" · "),
      duration: 5000,
    });

    setRows([]);
    setShowConfirmModal(false);
    setPendingSave([]);
  }

  function cancelSave() {
    setShowConfirmModal(false);
    setPendingSave([]);
  }

  function handleExport() {
    if (pendingExportCount === 0) {
      toast.info("Nenhum ajuste novo para exportar", {
        description: `Todos os ${exportedCount} ajuste(s) já foram exportados anteriormente.`,
        duration: 4000,
      });
      return;
    }
    try {
      const { json, exportedIds } = exportAdjustments();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      link.download = `ajustes-previsao-${ts}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      markAsExported(exportedIds);

      toast.success(`${exportedIds.length} ajuste(s) exportado(s) com sucesso!`, {
        description: `Arquivo JSON pronto para envio ao datalake. ${exportedCount} ajuste(s) anterior(es) não foram re-exportados.`,
        duration: 5000,
      });
    } catch (e) {
      toast.error("Erro ao exportar ajustes", {
        description: String(e),
      });
    }
  }

  function getRedistribInfo(row: AdjustmentRow): string | null {
    if (!row.item) return null;
    if (row.level === "CATEGORIA NÍVEL 3") {
      const children = catN3toN4[row.item] || [];
      const totalSkus = getSkuCountForItem(row.level, row.item);
      return `Redistribuirá entre ${children.length} subcategoria(s) e ${totalSkus} SKU(s)`;
    }
    if (row.level === "CATEGORIA NÍVEL 4") {
      const skuCount = getSkuCountForItem(row.level, row.item);
      return `Redistribuirá entre ${skuCount} SKU(s) proporcionalmente`;
    }
    return "Ajuste direto — altera apenas este SKU específico";
  }

  return (
    <div ref={tableRef} className="bg-white border border-border rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
            <Sliders className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Ajustes Colaborativos</h2>
            <p className="text-[11px] text-muted-foreground">
              Informe o ajuste mês a mês · Período: {activeMonths[0]} — {activeMonths[activeMonths.length - 1]} ({activeMonths.length} meses)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasAdjustments && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {savedAdjustments.length} ajuste(s) salvo(s)
              </span>
              {pendingExportCount > 0 && (
                <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {pendingExportCount} pendente(s) de exportação
                </span>
              )}
              {exportedCount > 0 && (
                <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  {exportedCount} já exportado(s)
                </span>
              )}
            </div>
          )}
          <button
            onClick={addRow}
            className="h-8 px-3 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Linha
          </button>
          <button
            onClick={handleSave}
            className="h-8 px-4 text-xs font-semibold text-white bg-[#059669] rounded-lg hover:bg-[#059669]/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Ajustes
          </button>
          {hasAdjustments && (
            <button
              onClick={handleExport}
              className={`h-8 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${pendingExportCount > 0
                  ? "text-white bg-primary hover:bg-primary/90 shadow-sm"
                  : "text-muted-foreground bg-muted border border-border cursor-default"
                }`}
            >
              <Download className="w-3.5 h-3.5" />
              {pendingExportCount > 0
                ? `Exportar ${pendingExportCount} Ajuste(s) para Datalake`
                : "Todos Exportados"}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar" style={{ minHeight: rows.length > 0 ? '280px' : undefined }}>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Sliders className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Nenhum ajuste adicionado</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Clique em "Adicionar Linha" para começar a ajustar a previsão mês a mês.
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-border bg-[#F8FAFC]">
                <th className="px-2 py-2.5 text-left w-8 sticky left-0 bg-[#F8FAFC] z-10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#</span>
                </th>
                <th className="px-2 py-2.5 text-left min-w-[160px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nível</span>
                </th>
                <th className="px-2 py-2.5 text-left min-w-[220px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item</span>
                </th>
                <th className="px-2 py-2.5 text-center w-[80px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</span>
                </th>
                {/* Monthly columns */}
                {activeMonths.map(month => (
                  <th key={month} className="px-1.5 py-2.5 text-center min-w-[72px]">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{month}</span>
                  </th>
                ))}
                <th className="px-2 py-2.5 text-right min-w-[100px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Prev. Original</span>
                </th>
                <th className="px-2 py-2.5 text-right min-w-[100px]">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Prev. Ajustada</span>
                </th>
                <th className="px-2 py-2.5 text-right min-w-[80px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Diferença</span>
                </th>
                <th className="px-2 py-2.5 w-16">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const totals = getRowTotals(row);
                const options = getItemOptions(row.level);
                const availableOptions = options.filter(o => o === row.item || !usedItems.has(o));
                const redistribInfo = getRedistribInfo(row);

                return (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-2 py-2 text-muted-foreground font-semibold sticky left-0 bg-white group-hover:bg-primary/[0.02] z-10">{idx + 1}</td>

                    {/* Level selector */}
                    <td className="px-2 py-2">
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === `level-${row.id}` ? null : `level-${row.id}`)}
                          className="flex items-center justify-between w-full h-7 px-2 text-[11px] bg-white border border-border rounded-lg hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            {row.level === "PRODUTO" ? (
                              <Package className="w-3 h-3 text-blue-600" />
                            ) : (
                              <GitBranch className="w-3 h-3 text-purple-600" />
                            )}
                            <span className="font-medium truncate">{row.level}</span>
                          </div>
                          <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                        </button>
                        {openDropdown === `level-${row.id}` && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-50">
                            {(["CATEGORIA NÍVEL 3", "CATEGORIA NÍVEL 4", "PRODUTO"] as AdjustmentLevel[]).map(level => (
                              <button
                                key={level}
                                onClick={() => { updateRow(row.id, "level", level); setOpenDropdown(null); }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${row.level === level ? "bg-primary/5 text-primary font-semibold" : ""
                                  }`}
                              >
                                {level === "PRODUTO" ? (
                                  <Package className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <GitBranch className="w-3 h-3 text-purple-600" />
                                )}
                                {level}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Item selector — Combobox with search */}
                    <td className="px-2 py-2">
                      <div className="relative">
                        {row.item ? (
                          <div className="flex items-center gap-1 w-full h-7 px-2 text-[11px] bg-white border border-border rounded-lg">
                            <span className="font-medium truncate flex-1">{row.item}</span>
                            <button
                              onClick={() => { updateRow(row.id, "item", ""); setItemSearchTerms(prev => ({ ...prev, [row.id]: "" })); }}
                              className="p-0.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                              title="Limpar seleção"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setOpenDropdown(openDropdown === `item-${row.id}` ? null : `item-${row.id}`);
                              setItemSearchTerms(prev => ({ ...prev, [row.id]: "" }));
                            }}
                            className="flex items-center justify-between w-full h-7 px-2 text-[11px] bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-lg transition-colors"
                          >
                            <span className="text-muted-foreground truncate">Selecione...</span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                          </button>
                        )}
                        {openDropdown === `item-${row.id}` && (() => {
                          const searchTerm = (itemSearchTerms[row.id] || "").toLowerCase();
                          const filteredOptions = searchTerm
                            ? availableOptions.filter(o => o.toLowerCase().includes(searchTerm))
                            : availableOptions;
                          return (
                            <div className="absolute top-full left-0 mt-1 w-[320px] bg-white border border-border rounded-lg shadow-xl z-50">
                              {/* Search input */}
                              <div className="p-2 border-b border-border">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <input
                                    type="text"
                                    placeholder="Buscar item..."
                                    value={itemSearchTerms[row.id] || ""}
                                    onChange={(e) => setItemSearchTerms(prev => ({ ...prev, [row.id]: e.target.value }))}
                                    autoFocus
                                    className="w-full h-7 pl-7 pr-2 text-xs border border-border rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                  />
                                </div>
                                <div className="text-[9px] text-muted-foreground mt-1 px-0.5">
                                  {filteredOptions.length} resultado(s) de {availableOptions.length}
                                </div>
                              </div>
                              {/* Options list */}
                              <div className="max-h-52 overflow-auto custom-scrollbar">
                                {filteredOptions.length === 0 ? (
                                  <div className="px-3 py-4 text-xs text-muted-foreground flex flex-col items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Nenhum resultado para "{itemSearchTerms[row.id]}"</span>
                                  </div>
                                ) : (
                                  filteredOptions.map((opt, optIdx) => {
                                    // Highlight matching text
                                    const idx = opt.toLowerCase().indexOf(searchTerm);
                                    const before = opt.slice(0, idx);
                                    const match = opt.slice(idx, idx + searchTerm.length);
                                    const after = opt.slice(idx + searchTerm.length);
                                    return (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          updateRow(row.id, "item", opt);
                                          setOpenDropdown(null);
                                          setItemSearchTerms(prev => ({ ...prev, [row.id]: "" }));
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors ${row.item === opt ? "bg-primary/5 text-primary font-semibold" : ""
                                          }`}
                                      >
                                        {searchTerm && idx >= 0 ? (
                                          <>{before}<mark className="bg-yellow-200 text-inherit rounded-sm px-0.5">{match}</mark>{after}</>
                                        ) : opt}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      {redistribInfo && row.item && (
                        <p className="text-[9px] text-purple-600 mt-0.5 flex items-center gap-0.5">
                          <GitBranch className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate">{redistribInfo}</span>
                        </p>
                      )}
                    </td>

                    {/* Type toggle */}
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-0.5 bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => updateRow(row.id, "type", "%")}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${row.type === "%"
                              ? "bg-white text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          %
                        </button>
                        <button
                          onClick={() => updateRow(row.id, "type", "QTD")}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${row.type === "QTD"
                              ? "bg-white text-primary shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          QTD
                        </button>
                      </div>
                    </td>

                    {/* Monthly value inputs */}
                    {activeMonths.map(month => {
                      const monthForecast = row.item ? getMonthlyForecastForItem(row.level, row.item, month) : 0;
                      const rawVal = row.monthlyValues[month];
                      const numVal = typeof rawVal === "string" ? parseFloat(rawVal) || 0 : rawVal;
                      const hasValue = numVal !== 0;

                      return (
                        <td key={month} className="px-1 py-2">
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="number"
                              placeholder="0"
                              value={row.monthlyValues[month] ?? ""}
                              onChange={(e) => updateMonthlyValue(row.id, month, e.target.value)}
                              disabled={!row.item}
                              className={`w-full h-7 px-1.5 text-[11px] text-center font-semibold tabular-nums border rounded-lg outline-none transition-all ${!row.item
                                  ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                                  : hasValue
                                    ? "border-primary/30 bg-primary/5 text-primary focus:border-primary focus:ring-1 focus:ring-primary/20"
                                    : "border-border hover:border-primary/30 focus:border-primary focus:ring-1 focus:ring-primary/20"
                                }`}
                            />
                            {row.item && (
                              <span className="text-[8px] text-muted-foreground tabular-nums">
                                {monthForecast > 0 ? monthForecast.toLocaleString("pt-BR") : "—"}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Previsão Original (total) */}
                    <td className="px-2 py-2 text-right font-semibold tabular-nums text-muted-foreground">
                      {totals.original > 0 ? totals.original.toLocaleString("pt-BR") : "—"}
                    </td>

                    {/* Previsão Ajustada (total) */}
                    <td className="px-2 py-2 text-right font-bold tabular-nums text-amber-700 bg-amber-50/30">
                      {totals.adjusted > 0 ? totals.adjusted.toLocaleString("pt-BR") : "—"}
                    </td>

                    {/* Diferença (total) */}
                    <td className={`px-2 py-2 text-right font-semibold tabular-nums ${totals.diff > 0 ? "text-emerald-700" : totals.diff < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}>
                      {totals.original > 0 && totals.diff !== 0
                        ? `${totals.diff > 0 ? "+" : ""}${totals.diff.toLocaleString("pt-BR")}`
                        : "—"
                      }
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        {/* Apply first month value to all */}
                        {row.item && (
                          <button
                            onClick={() => {
                              const firstVal = row.monthlyValues[activeMonths[0]];
                              const val = typeof firstVal === "string" ? firstVal : String(firstVal);
                              if (val && val !== "0") {
                                applyToAllMonths(row.id, val);
                                toast.info(`Valor ${val}${row.type === "%" ? "%" : " un."} aplicado a todos os ${activeMonths.length} meses`);
                              }
                            }}
                            title="Aplicar valor do 1º mês a todos"
                            className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => removeRow(row.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with summary */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-[#F8FAFC] rounded-b-xl">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{rows.length}</span> linha(s) de ajuste
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {rows.filter(r => r.item && Object.values(r.monthlyValues).some(v => {
                  const num = typeof v === "string" ? parseFloat(v) || 0 : v;
                  return num !== 0;
                })).length}
              </span> ajuste(s) válido(s)
            </span>
          </div>
          <button
            onClick={addRow}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar mais uma linha
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Confirmar Salvamento de Ajustes
            </DialogTitle>
            <DialogDescription>
              Você está prestes a salvar os seguintes ajustes. Revise o resumo antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {pendingSave.map((adj, idx) => {
              const diff = adj.previsaoAjustada - adj.previsaoOriginal;
              const pct = adj.previsaoOriginal > 0 ? ((diff / adj.previsaoOriginal) * 100).toFixed(1) : "0";
              return (
                <div key={idx} className="p-3 bg-muted rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{adj.item}</span>
                    <span className={`text-xs font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}>
                      {diff > 0 ? "+" : ""}{pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Impacto:</span>
                    <span className="font-semibold">
                      {diff > 0 ? "+" : ""}{diff.toLocaleString("pt-BR")} un.
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Impacto Total:</span>
                <span className={`${pendingSave.reduce((s, a) => s + (a.previsaoAjustada - a.previsaoOriginal), 0) > 0
                    ? "text-emerald-600"
                    : "text-red-600"
                  }`}>
                  {pendingSave.reduce((s, a) => s + (a.previsaoAjustada - a.previsaoOriginal), 0) > 0 ? "+" : ""}
                  {pendingSave.reduce((s, a) => s + (a.previsaoAjustada - a.previsaoOriginal), 0).toLocaleString("pt-BR")} un.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelSave}>
              Cancelar
            </Button>
            <Button onClick={confirmSave} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
