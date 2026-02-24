/*
  SupplierAdjustment Component — Ajuste por Fornecedor
  Permite ao comprador selecionar um fornecedor e depois ajustar por:
  - Categoria Nível 3 (filtra apenas N3 do fornecedor)
  - Categoria Nível 4 (filtra apenas N4 do fornecedor)
  - Produto individual (filtra apenas produtos do fornecedor)
  
  Fluxo: Fornecedor → Nível → Item filtrado → Ajuste mês a mês
  Integra com ForecastContext para salvar e propagar ajustes
*/
import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, Save, ChevronDown, AlertCircle, Sliders, GitBranch, Package, Search, X, Truck, ArrowRight, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { allProducts } from "@/lib/mockData";
import { useForecast, type AdjustmentLevel, type AdjustmentType, type SavedAdjustment } from "@/contexts/ForecastContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useShallow } from "zustand/react/shallow";
import { useDebounce } from "use-debounce";
import { DEFAULT_USER } from "@/lib/constants";
import { toast } from "sonner";

interface SupplierAdjustmentRow {
  id: string;
  fornecedor: string;
  level: AdjustmentLevel;
  item: string;
  type: AdjustmentType;
  monthlyValues: Record<string, number | string>;
}

function calculateMonthlyAdjusted(original: number, type: AdjustmentType, value: number): number {
  if (type === "%") {
    return Math.round(original * (1 + value / 100));
  }
  return original + value;
}

export default function SupplierAdjustment() {
  const [rows, setRows] = useState<SupplierAdjustmentRow[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [debouncedSearchTerms] = useDebounce(searchTerms, 200);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSave, setPendingSave] = useState<SavedAdjustment[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const { saveAdjustments, getMonthlyForecastForItem, getSkuCountForItem, catN3toN4 } = useForecast(useShallow(state => ({
    saveAdjustments: state.saveAdjustments,
    getMonthlyForecastForItem: state.getMonthlyForecastForItem,
    getSkuCountForItem: state.getSkuCountForItem,
    catN3toN4: state.catN3toN4
  })));
  const { activeMonths } = usePeriod();

  // Build supplier → products/categories mapping from actual product data
  const supplierData = useMemo(() => {
    const map: Record<string, {
      products: typeof allProducts;
      categoriesN3: string[];
      categoriesN4: string[];
    }> = {};

    // Extract unique suppliers directly from products (guarantees all have SKUs)
    const supplierArr = Array.from(new Set(allProducts.map(p => p.fornecedor)));
    for (const forn of supplierArr) {
      const products = allProducts.filter(p => p.fornecedor === forn);
      if (products.length === 0) continue; // skip suppliers with no products
      const n4Set = new Set(products.map(p => p.categoria4));
      const n3Set = new Set(products.map(p => p.categoria3));
      map[forn] = {
        products,
        categoriesN3: Array.from(n3Set).sort(),
        categoriesN4: Array.from(n4Set).sort(),
      };
    }
    return map;
  }, []);

  // Sorted list of suppliers with products
  const availableSuppliers = useMemo(() => {
    return Object.keys(supplierData).sort();
  }, [supplierData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getItemOptionsForSupplier(fornecedor: string, level: AdjustmentLevel): string[] {
    const data = supplierData[fornecedor];
    if (!data) return [];
    switch (level) {
      case "CATEGORIA NÍVEL 3":
        return data.categoriesN3;
      case "CATEGORIA NÍVEL 4":
        return data.categoriesN4;
      case "PRODUTO":
        return data.products.map(p => `${p.codigo} - ${p.nome}`);
      default:
        return [];
    }
  }

  function addRow() {
    const monthlyValues: Record<string, number | string> = {};
    for (const m of activeMonths) {
      monthlyValues[m] = "";
    }
    const newRow: SupplierAdjustmentRow = {
      id: crypto.randomUUID(),
      fornecedor: "",
      level: "CATEGORIA NÍVEL 4",
      item: "",
      type: "%",
      monthlyValues,
    };
    setRows([...rows, newRow]);
  }

  function removeRow(id: string) {
    setRows(rows.filter(r => r.id !== id));
  }

  function updateRow(id: string, field: keyof SupplierAdjustmentRow, value: any) {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };

      // Reset downstream when fornecedor changes
      if (field === "fornecedor") {
        updated.item = "";
        const monthlyValues: Record<string, number | string> = {};
        for (const m of activeMonths) {
          monthlyValues[m] = "";
        }
        updated.monthlyValues = monthlyValues;
      }

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
  }

  function updateMonthlyValue(id: string, month: string, value: string) {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        monthlyValues: { ...r.monthlyValues, [month]: value },
      };
    }));
  }

  function applyToAllMonths(id: string, value: string) {
    setRows(rows.map(r => {
      if (r.id !== id) return r;
      const monthlyValues: Record<string, number | string> = {};
      for (const m of activeMonths) {
        monthlyValues[m] = value;
      }
      return { ...r, monthlyValues };
    }));
  }

  function getRowTotals(row: SupplierAdjustmentRow) {
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

  function getRedistribInfo(row: SupplierAdjustmentRow): string | null {
    if (!row.item || !row.fornecedor) return null;
    const data = supplierData[row.fornecedor];
    if (!data) return null;

    if (row.level === "CATEGORIA NÍVEL 3") {
      const children = catN3toN4[row.item] || [];
      // Filter children that belong to this supplier
      const supplierChildren = children.filter(c => data.categoriesN4.includes(c));
      const totalSkus = data.products.filter(p => p.categoria3 === row.item).length;
      return `Fornecedor: ${row.fornecedor} · ${supplierChildren.length} subcategoria(s), ${totalSkus} SKU(s)`;
    }
    if (row.level === "CATEGORIA NÍVEL 4") {
      const skuCount = data.products.filter(p => p.categoria4 === row.item).length;
      return `Fornecedor: ${row.fornecedor} · ${skuCount} SKU(s) proporcionalmente`;
    }
    return `Fornecedor: ${row.fornecedor} · Ajuste direto no SKU`;
  }

  function handleSave() {
    const validRows = rows.filter(r => {
      if (!r.item || !r.fornecedor) return false;
      return Object.values(r.monthlyValues).some(v => {
        const num = typeof v === "string" ? parseFloat(v) || 0 : v;
        return num !== 0;
      });
    });

    if (validRows.length === 0) {
      toast.error("Nenhum ajuste válido para salvar. Selecione fornecedor, item e preencha ao menos um mês.");
      return;
    }

    const now = new Date();
    const timestamp = `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const newAdjustments: SavedAdjustment[] = validRows.map(r => {
      const totals = getRowTotals(r);
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

    setPendingSave(newAdjustments);
    setShowConfirmModal(true);
  }

  function confirmSave() {
    saveAdjustments(pendingSave);
    const validRows = rows.filter(r => {
      if (!r.item || !r.fornecedor) return false;
      return Object.values(r.monthlyValues).some(v => {
        const num = typeof v === "string" ? parseFloat(v) || 0 : v;
        return num !== 0;
      });
    });

    toast.success(`${validRows.length} ajuste(s) por fornecedor salvo(s)!`, {
      description: validRows.map(r => `${r.fornecedor} → ${r.item}`).join(" · "),
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

  // Dropdown renderer helper
  function renderSearchableDropdown(
    rowId: string,
    dropdownKey: string,
    options: string[],
    currentValue: string,
    onSelect: (val: string) => void,
    placeholder: string,
    width: string = "w-[320px]",
  ) {
    const searchTerm = (debouncedSearchTerms[`${rowId}-${dropdownKey}`] || "").toLowerCase();
    const inputValue = searchTerms[`${rowId}-${dropdownKey}`] || "";
    const filteredOptions = searchTerm
      ? options.filter(o => o.toLowerCase().includes(searchTerm))
      : options;

    return (
      <div className={`absolute top-full left-0 mt-1 ${width} bg-white border border-border rounded-lg shadow-xl z-50`}>
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Buscar ${placeholder.toLowerCase()}...`}
              value={inputValue}
              onChange={(e) => setSearchTerms(prev => ({ ...prev, [`${rowId}-${dropdownKey}`]: e.target.value }))}
              autoFocus
              className="w-full h-7 pl-7 pr-2 text-xs border border-border rounded-md focus:outline-none focus:border-[#0F4C75] focus:ring-1 focus:ring-[#0F4C75]/20"
            />
          </div>
          <div className="text-[9px] text-muted-foreground mt-1 px-0.5">
            {filteredOptions.length} resultado(s) de {options.length}
          </div>
        </div>
        <div className="max-h-52 overflow-auto custom-scrollbar">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground flex flex-col items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>Nenhum resultado</span>
            </div>
          ) : (
            filteredOptions.map((opt, optIdx) => {
              const idx = opt.toLowerCase().indexOf(searchTerm);
              const before = idx >= 0 ? opt.slice(0, idx) : opt;
              const match = idx >= 0 ? opt.slice(idx, idx + searchTerm.length) : "";
              const after = idx >= 0 ? opt.slice(idx + searchTerm.length) : "";
              return (
                <button
                  key={`${opt}-${optIdx}`}
                  onClick={() => {
                    onSelect(opt);
                    setOpenDropdown(null);
                    setSearchTerms(prev => ({ ...prev, [`${rowId}-${dropdownKey}`]: "" }));
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors ${currentValue === opt ? "bg-[#0F4C75]/5 text-[#0F4C75] font-semibold" : ""
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
  }

  return (
    <div ref={tableRef} className="bg-white border border-border rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100">
            <Truck className="w-4 h-4 text-violet-700" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Ajuste por Fornecedor</h2>
            <p className="text-[11px] text-muted-foreground">
              Selecione o fornecedor e ajuste por categoria ou produto · {activeMonths.length} meses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="h-8 px-3 text-xs font-semibold text-violet-700 border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Linha
          </button>
          <button
            onClick={handleSave}
            className="h-8 px-4 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Ajustes
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar" style={{ minHeight: rows.length > 0 ? '280px' : undefined }}>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mb-3">
              <Truck className="w-5 h-5 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground mb-1">Nenhum ajuste por fornecedor</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Clique em "Adicionar Linha" para ajustar a previsão selecionando primeiro o fornecedor.
            </p>
            <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground bg-muted px-4 py-2 rounded-lg">
              <Truck className="w-3.5 h-3.5 text-violet-500" />
              <ArrowRight className="w-3 h-3" />
              <GitBranch className="w-3.5 h-3.5 text-purple-500" />
              <span>Nível</span>
              <ArrowRight className="w-3 h-3" />
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>Item</span>
              <ArrowRight className="w-3 h-3" />
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>Ajuste</span>
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-border bg-violet-50/50">
                <th className="px-2 py-2.5 text-left w-8 sticky left-0 bg-violet-50/50 z-10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#</span>
                </th>
                <th className="px-2 py-2.5 text-left min-w-[200px]">
                  <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Fornecedor
                  </span>
                </th>
                <th className="px-2 py-2.5 text-left min-w-[150px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nível</span>
                </th>
                <th className="px-2 py-2.5 text-left min-w-[200px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Item</span>
                </th>
                <th className="px-2 py-2.5 text-center w-[80px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</span>
                </th>
                {activeMonths.map(month => (
                  <th key={month} className="px-1.5 py-2.5 text-center min-w-[72px]">
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">{month}</span>
                  </th>
                ))}
                <th className="px-2 py-2.5 text-right min-w-[90px]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Prev. Orig.</span>
                </th>
                <th className="px-2 py-2.5 text-right min-w-[90px]">
                  <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Prev. Ajust.</span>
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
                const options = row.fornecedor ? getItemOptionsForSupplier(row.fornecedor, row.level) : [];
                const redistribInfo = getRedistribInfo(row);
                const supplierInfo = row.fornecedor ? supplierData[row.fornecedor] : null;

                return (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-violet-50/30 transition-colors group">
                    <td className="px-2 py-2 text-muted-foreground font-semibold sticky left-0 bg-white group-hover:bg-violet-50/30 z-10">{idx + 1}</td>

                    {/* Fornecedor selector */}
                    <td className="px-2 py-2">
                      <div className="relative">
                        {row.fornecedor ? (
                          <div className="flex items-center gap-1 w-full h-7 px-2 text-[11px] bg-violet-50 border border-violet-200 rounded-lg">
                            <Truck className="w-3 h-3 text-violet-600 flex-shrink-0" />
                            <span className="font-medium truncate flex-1">{row.fornecedor}</span>
                            <button
                              onClick={() => { updateRow(row.id, "fornecedor", ""); setSearchTerms(prev => ({ ...prev, [`${row.id}-fornecedor`]: "" })); }}
                              className="p-0.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                              title="Limpar fornecedor"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setOpenDropdown(openDropdown === `forn-${row.id}` ? null : `forn-${row.id}`);
                              setSearchTerms(prev => ({ ...prev, [`${row.id}-fornecedor`]: "" }));
                            }}
                            className="flex items-center justify-between w-full h-7 px-2 text-[11px] bg-violet-50 border border-violet-300 hover:border-violet-400 rounded-lg transition-colors"
                          >
                            <span className="text-muted-foreground truncate flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              Selecione fornecedor...
                            </span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                          </button>
                        )}
                        {openDropdown === `forn-${row.id}` &&
                          renderSearchableDropdown(
                            row.id,
                            "fornecedor",
                            availableSuppliers,
                            row.fornecedor,
                            (val) => updateRow(row.id, "fornecedor", val),
                            "Fornecedor",
                            "w-[300px]",
                          )
                        }
                      </div>
                      {supplierInfo && (
                        <p className="text-[9px] text-violet-600 mt-0.5 flex items-center gap-0.5">
                          <Package className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{supplierInfo.products.length} SKU(s) · {supplierInfo.categoriesN4.length} Cat N4 · {supplierInfo.categoriesN3.length} Cat N3</span>
                        </p>
                      )}
                    </td>

                    {/* Level selector */}
                    <td className="px-2 py-2">
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === `level-${row.id}` ? null : `level-${row.id}`)}
                          disabled={!row.fornecedor}
                          className={`flex items-center justify-between w-full h-7 px-2 text-[11px] border rounded-lg transition-colors ${!row.fornecedor
                            ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                            : "bg-white border-border hover:border-violet-300"
                            }`}
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
                        {openDropdown === `level-${row.id}` && row.fornecedor && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-50">
                            {(["CATEGORIA NÍVEL 3", "CATEGORIA NÍVEL 4", "PRODUTO"] as AdjustmentLevel[]).map(level => {
                              const count = getItemOptionsForSupplier(row.fornecedor, level).length;
                              return (
                                <button
                                  key={level}
                                  onClick={() => { updateRow(row.id, "level", level); setOpenDropdown(null); }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center justify-between ${row.level === level ? "bg-violet-50 text-violet-700 font-semibold" : ""
                                    }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {level === "PRODUTO" ? (
                                      <Package className="w-3 h-3 text-blue-600" />
                                    ) : (
                                      <GitBranch className="w-3 h-3 text-purple-600" />
                                    )}
                                    {level}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Item selector */}
                    <td className="px-2 py-2">
                      <div className="relative">
                        {row.item ? (
                          <div className="flex items-center gap-1 w-full h-7 px-2 text-[11px] bg-white border border-border rounded-lg">
                            <span className="font-medium truncate flex-1">{row.item}</span>
                            <button
                              onClick={() => { updateRow(row.id, "item", ""); setSearchTerms(prev => ({ ...prev, [`${row.id}-item`]: "" })); }}
                              className="p-0.5 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                              title="Limpar seleção"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!row.fornecedor) {
                                toast.warning("Selecione um fornecedor primeiro");
                                return;
                              }
                              setOpenDropdown(openDropdown === `item-${row.id}` ? null : `item-${row.id}`);
                              setSearchTerms(prev => ({ ...prev, [`${row.id}-item`]: "" }));
                            }}
                            disabled={!row.fornecedor}
                            className={`flex items-center justify-between w-full h-7 px-2 text-[11px] border rounded-lg transition-colors ${!row.fornecedor
                              ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                              : "bg-amber-50 border-amber-200 hover:border-amber-300"
                              }`}
                          >
                            <span className="text-muted-foreground truncate">
                              {!row.fornecedor ? "Selecione fornecedor..." : "Selecione item..."}
                            </span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground ml-1 flex-shrink-0" />
                          </button>
                        )}
                        {openDropdown === `item-${row.id}` && row.fornecedor &&
                          renderSearchableDropdown(
                            row.id,
                            "item",
                            options,
                            row.item,
                            (val) => updateRow(row.id, "item", val),
                            "Item",
                          )
                        }
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
                            ? "bg-white text-violet-700 shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          %
                        </button>
                        <button
                          onClick={() => updateRow(row.id, "type", "QTD")}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all ${row.type === "QTD"
                            ? "bg-white text-violet-700 shadow-sm"
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
                                  ? "border-violet-300 bg-violet-50 text-violet-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
                                  : "border-border hover:border-violet-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
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

                    {/* Previsão Original */}
                    <td className="px-2 py-2 text-right font-semibold tabular-nums text-muted-foreground">
                      {totals.original > 0 ? totals.original.toLocaleString("pt-BR") : "—"}
                    </td>

                    {/* Previsão Ajustada */}
                    <td className="px-2 py-2 text-right font-bold tabular-nums text-violet-700 bg-violet-50/30">
                      {totals.adjusted > 0 ? totals.adjusted.toLocaleString("pt-BR") : "—"}
                    </td>

                    {/* Diferença */}
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
                            className="p-1 rounded-lg text-muted-foreground hover:text-violet-700 hover:bg-violet-50 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
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

      {/* Footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-violet-50/30 rounded-b-xl">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{rows.length}</span> linha(s)
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {rows.filter(r => r.item && r.fornecedor && Object.values(r.monthlyValues).some(v => {
                  const num = typeof v === "string" ? parseFloat(v) || 0 : v;
                  return num !== 0;
                })).length}
              </span> ajuste(s) válido(s)
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {new Set(rows.filter(r => r.fornecedor).map(r => r.fornecedor)).size}
              </span> fornecedor(es)
            </span>
          </div>
          <button
            onClick={addRow}
            className="text-xs font-medium text-violet-700 hover:underline flex items-center gap-1"
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
              <Truck className="w-5 h-5 text-violet-600" />
              Confirmar Ajustes por Fornecedor
            </DialogTitle>
            <DialogDescription>
              Revise os ajustes antes de confirmar. Os valores serão redistribuídos proporcionalmente entre os SKUs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {pendingSave.map((adj, idx) => {
              const diff = adj.previsaoAjustada - adj.previsaoOriginal;
              const pct = adj.previsaoOriginal > 0 ? ((diff / adj.previsaoOriginal) * 100).toFixed(1) : "0";
              // Find the corresponding row to get fornecedor info
              const matchRow = rows.find(r => r.item === adj.item);
              return (
                <div key={idx} className="p-3 bg-violet-50 rounded-lg space-y-1.5">
                  {matchRow?.fornecedor && (
                    <div className="flex items-center gap-1.5 text-[10px] text-violet-600 font-semibold">
                      <Truck className="w-3 h-3" />
                      {matchRow.fornecedor}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{adj.item}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{adj.level}</span>
                    </div>
                    <span className={`text-xs font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : "text-muted-foreground"
                      }`}>
                      {diff > 0 ? "+" : ""}{pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{adj.previsaoOriginal.toLocaleString("pt-BR")} → {adj.previsaoAjustada.toLocaleString("pt-BR")} un.</span>
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
            <Button onClick={confirmSave} className="bg-violet-600 hover:bg-violet-700">
              <Save className="w-4 h-4 mr-2" />
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
