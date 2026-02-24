/*
  ComparisonTable Component — Clean Pharma Analytics
  Tabela comparativa com dados de meses e trimestres
  - Altura fixa para 15 linhas com scroll vertical
  - Conectada ao FilterContext para filtragem
  - EDIÇÃO INLINE com MODAL DE CONFIRMAÇÃO:
    - Clique na célula Qtd para editar o valor
    - Enter ou blur abre modal de confirmação com impacto estimado
    - Modal mostra: valor original, novo, delta %, SKUs afetados, impacto no trimestre
    - Confirmar salva o ajuste via ForecastContext
    - Cancelar descarta a edição
*/
import { Table2, MessageSquare, Pencil, AlertTriangle, ArrowRight, Users, TrendingUp, TrendingDown, Package, ShieldCheck, ShieldAlert, ShieldQuestion, Info } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useFilters } from "@/contexts/FilterContext";
import { useForecast, type SavedAdjustment } from "@/contexts/ForecastContext";
import { catN4CdMonthlyHistorico } from "@/lib/mockData";
import { comparisonData } from "@/lib/dataDerived";
import { DATA_BOUNDARIES } from "@/lib/dataBoundaries";
import { MONTHS_PT_NUMBER } from "@/lib/constants";
import { DEFAULT_USER } from "@/lib/constants";

// ============================================================
// Month mapping for inline edits — dynamic from data boundaries
// ============================================================
const MONTH_KEYS = DATA_BOUNDARIES.forecastMonths.slice(0, 3);
const MONTH_LABELS_MAP: Record<string, string> = Object.fromEntries(
  MONTH_KEYS.map((m, i) => [m, `Mês ${i} (${m})`])
);

// ============================================================
// Sparkline — Mini SVG trend chart for last 8 months
// ============================================================
// Sparkline: last 8 historical months — detected from data
const _sparklineMonths = DATA_BOUNDARIES.historicalMonths.slice(-8);
const SPARKLINE_MONTHS = _sparklineMonths.map(m => {
  // Convert "Jan/26" → "2026_01" for historico lookup
  const [mon, yr] = m.split("/");
  return `20${yr}_${String(MONTHS_PT_NUMBER[mon]).padStart(2, "0")}`;
});
const SPARKLINE_LABELS = _sparklineMonths;

// Aggregate historical data across all CDs for a given category
function getSparklineData(categoria: string): number[] {
  const catData = catN4CdMonthlyHistorico[categoria];
  if (!catData) return [];

  const monthlyTotals: number[] = SPARKLINE_MONTHS.map(monthKey => {
    let total = 0;
    for (const cdKey of Object.keys(catData)) {
      const cdMonths = catData[Number(cdKey)];
      if (cdMonths && cdMonths[monthKey] != null) {
        total += cdMonths[monthKey];
      }
    }
    return total;
  });

  return monthlyTotals;
}

const Sparkline = memo(function Sparkline({ categoria }: { categoria: string }) {
  const data = useMemo(() => getSparklineData(categoria), [categoria]);

  if (data.length < 2 || data.every(v => v === 0)) return null;

  const w = 72;
  const h = 24;
  const padX = 1;
  const padY = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (w - 2 * padX);
    const y = padY + (1 - (v - min) / range) * (h - 2 * padY);
    return { x, y, v };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  // Gradient fill area
  const areaPath = `M${points[0].x},${h} ` +
    points.map(p => `L${p.x},${p.y}`).join(" ") +
    ` L${points[points.length - 1].x},${h} Z`;

  // Determine trend color
  const first = data[0];
  const last = data[data.length - 1];
  const trend = last >= first ? "up" : "down";
  const strokeColor = trend === "up" ? "#059669" : "#dc2626";
  const fillColor = trend === "up" ? "#059669" : "#dc2626";

  // Build tooltip text
  const tooltipLines = data.map((v, i) =>
    `${SPARKLINE_LABELS[i]}: ${v.toLocaleString("pt-BR")}`
  ).join("\n");
  const pctChange = first > 0 ? ((last - first) / first * 100).toFixed(1) : "—";
  const tooltipText = `Tendência ${trend === "up" ? "↑" : "↓"} (${pctChange}%)\n${tooltipLines}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="flex-shrink-0 cursor-help"
      aria-label={`Sparkline ${categoria}`}
    >
      <title>{tooltipText}</title>
      <defs>
        <linearGradient id={`spark-grad-${categoria.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#spark-grad-${categoria.replace(/\s+/g, "-")})`}
      />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
});

function formatVal(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// ============================================================
// Confidence Level Calculation
// Based on: CV of trimestral data, magnitude of %LY variations, null data presence
// ============================================================
type ConfidenceLevel = "alta" | "media" | "baixa";

interface ConfidenceInfo {
  level: ConfidenceLevel;
  score: number; // 0-100
  reasons: string[];
}

function calcConfidence(row: typeof comparisonData[0]): ConfidenceInfo {
  const reasons: string[] = [];
  let score = 100;

  // 1. Check for null data (missing history)
  const nullCount = [row.varLY, row.varLY1, row.varLY2, row.varLM, row.triAnterior].filter(v => v === null || v === 0).length;
  if (nullCount >= 3) {
    score -= 45;
    reasons.push("Histórico insuficiente");
  } else if (nullCount >= 1) {
    score -= 15;
    reasons.push("Dados parciais no histórico");
  }

  // 2. CV of trimestral values (Anterior, Penúltimo, Último)
  const triValues = [row.triAnterior, row.penTrimestre, row.ultTrimestre].filter((v): v is number => v !== null && v > 0);
  if (triValues.length >= 2) {
    const mean = triValues.reduce((a, b) => a + b, 0) / triValues.length;
    const variance = triValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / triValues.length;
    const cv = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 100;
    if (cv > 50) {
      score -= 35;
      reasons.push(`Alta variabilidade trimestral (CV ${cv.toFixed(0)}%)`);
    } else if (cv > 25) {
      score -= 20;
      reasons.push(`Variabilidade moderada (CV ${cv.toFixed(0)}%)`);
    } else if (cv > 15) {
      score -= 10;
      reasons.push(`Variabilidade aceitável (CV ${cv.toFixed(0)}%)`);
    }
  } else {
    score -= 30;
    reasons.push("Poucos trimestres para análise");
  }

  // 3. Magnitude of %LY variations — extreme variations reduce confidence
  const lyVals = [row.varLY, row.varLY1, row.varLY2].filter((v): v is number => v !== null);
  if (lyVals.length > 0) {
    const maxAbsLY = Math.max(...lyVals.map(Math.abs));
    const avgAbsLY = lyVals.reduce((a, b) => a + Math.abs(b), 0) / lyVals.length;
    if (maxAbsLY > 200) {
      score -= 25;
      reasons.push(`Variação extrema vs ano anterior (${maxAbsLY.toFixed(0)}%)`);
    } else if (maxAbsLY > 100) {
      score -= 15;
      reasons.push(`Variação alta vs ano anterior (${maxAbsLY.toFixed(0)}%)`);
    } else if (avgAbsLY > 50) {
      score -= 10;
      reasons.push(`Variação significativa vs ano anterior`);
    }

    // 4. Inconsistency between months — high spread between LY values
    if (lyVals.length >= 2) {
      const lyRange = Math.max(...lyVals) - Math.min(...lyVals);
      if (lyRange > 100) {
        score -= 10;
        reasons.push("Padrão inconsistente entre meses");
      }
    }
  }

  // 5. Very small volumes are inherently less reliable
  const totalTri = row.triAtual ?? 0;
  if (totalTri < 50) {
    score -= 15;
    reasons.push("Volume muito baixo (< 50 un./tri)");
  } else if (totalTri < 200) {
    score -= 8;
    reasons.push("Volume baixo (< 200 un./tri)");
  }

  score = Math.max(0, Math.min(100, score));

  let level: ConfidenceLevel;
  if (score >= 65) level = "alta";
  else if (score >= 40) level = "media";
  else level = "baixa";

  if (reasons.length === 0) reasons.push("Histórico estável e consistente");

  return { level, score, reasons };
}

// Pre-compute confidence for all categories
const confidenceMap = new Map<string, ConfidenceInfo>();
for (const row of comparisonData) {
  confidenceMap.set(row.categoria, calcConfidence(row));
}

// ============================================================
// ConfidenceBadge — Visual indicator for forecast confidence
// ============================================================
function ConfidenceBadge({ categoria }: { categoria: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const conf = confidenceMap.get(categoria);
  if (!conf) return null;

  const config = {
    alta: {
      icon: ShieldCheck,
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      iconColor: "text-emerald-600",
      label: "Alta",
      barColor: "bg-emerald-500",
    },
    media: {
      icon: ShieldQuestion,
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      iconColor: "text-amber-500",
      label: "Média",
      barColor: "bg-amber-500",
    },
    baixa: {
      icon: ShieldAlert,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      iconColor: "text-red-500",
      label: "Baixa",
      barColor: "bg-red-500",
    },
  }[conf.level];

  const Icon = config.icon;

  const iconRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowOnTop, setArrowOnTop] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Position tooltip after render using useEffect
  useEffect(() => {
    if (!showTooltip || !iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const tooltipW = 260;
    const tooltipH = 140; // estimated
    const gap = 8;

    // Decide vertical position: above or below
    let top: number;
    let placeBelow = false;
    if (rect.top - tooltipH - gap < 10) {
      // Not enough space above, place below
      top = rect.bottom + gap;
      placeBelow = true;
    } else {
      top = rect.top - gap;
    }

    // Decide horizontal position: try center, clamp to viewport
    let left = rect.left + rect.width / 2;
    const halfW = tooltipW / 2;
    if (left - halfW < 8) {
      left = 8 + halfW; // push right
    } else if (left + halfW > window.innerWidth - 8) {
      left = window.innerWidth - 8 - halfW; // push left
    }

    setArrowOnTop(placeBelow);
    setTooltipStyle({
      position: "fixed" as const,
      zIndex: 99999,
      width: tooltipW,
      left,
      top,
      transform: placeBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
      pointerEvents: "none" as const,
    });
  }, [showTooltip]);

  return (
    <div className="relative inline-flex">
      <div
        ref={iconRef}
        className="inline-flex items-center gap-0.5 cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
      </div>
      {showTooltip && createPortal(
        <div ref={tooltipRef} style={tooltipStyle}>
          {/* Arrow on top when tooltip is below the icon */}
          {arrowOnTop && (
            <div className="flex justify-center mb-[-1px]">
              <div className={`w-2.5 h-2.5 rotate-45 ${config.bg} border-t border-l ${config.border}`} />
            </div>
          )}
          <div className={`${config.bg} border ${config.border} rounded-lg shadow-xl p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.iconColor}`} />
                <span className={`text-[11px] font-bold ${config.text} whitespace-nowrap`}>Confiança {config.label}</span>
              </div>
              <span className={`text-[10px] font-bold ${config.text} whitespace-nowrap ml-2`}>{conf.score}/100</span>
            </div>
            {/* Score bar */}
            <div className="w-full h-1.5 bg-gray-200 rounded-full mb-2">
              <div className={`h-full rounded-full ${config.barColor} transition-all`} style={{ width: `${conf.score}%` }} />
            </div>
            {/* Reasons */}
            <div className="space-y-0.5">
              {conf.reasons.map((r, i) => (
                <p key={i} className="text-[10px] text-foreground/70 flex items-start gap-1 leading-tight">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  <span>{r}</span>
                </p>
              ))}
            </div>
            {conf.level === "baixa" && (
              <p className="text-[10px] font-semibold text-red-600 mt-1.5 pt-1.5 border-t border-red-200">
                Recomendado: revisão manual pelo comprador
              </p>
            )}
          </div>
          {/* Arrow on bottom when tooltip is above the icon */}
          {!arrowOnTop && (
            <div className="flex justify-center -mt-[1px]">
              <div className={`w-2.5 h-2.5 rotate-45 ${config.bg} border-b border-r ${config.border}`} />
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function formatPct(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
}

const VarCell = memo(function VarCell({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <td className="px-2 py-2 text-center text-xs text-muted-foreground">—</td>;
  const isPositive = value >= 0;
  return (
    <td className={`px-2 py-2 text-center text-xs font-semibold tabular-nums ${isPositive ? "text-emerald-700" : "text-red-600"}`}>
      {formatPct(value)}
    </td>
  );
});

// ============================================================
// PendingEdit type — holds data for confirmation modal
// ============================================================
interface PendingEdit {
  categoria: string;
  monthKey: string;
  newValue: number;
  originalMonthValue: number;
  pctChange: number;
  skuCount: number;
  // Trimestre impact
  currentTriAtual: number;
  newTriAtual: number;
  triDelta: number;
}

// ============================================================
// ConfirmationModal — Mini-modal de confirmação de ajuste
// ============================================================
function ConfirmationModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingEdit;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isIncrease = pending.pctChange >= 0;
  const delta = pending.newValue - pending.originalMonthValue;

  // Close on Escape / Confirm on Enter — with delay to avoid capturing the Enter from the input
  useEffect(() => {
    let active = false;
    const timer = setTimeout(() => { active = true; }, 150);
    const handler = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener("keydown", handler);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", handler); };
  }, [onCancel, onConfirm]);

  // Focus trap
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isIncrease ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${isIncrease ? "bg-emerald-100" : "bg-red-100"}`}>
              {isIncrease
                ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                : <TrendingDown className="w-5 h-5 text-red-600" />
              }
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Confirmar Ajuste de Previsão</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pending.categoria} · {MONTH_LABELS_MAP[pending.monthKey]}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Value comparison */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Original</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{formatVal(pending.originalMonthValue)}</p>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isIncrease ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {delta > 0 ? "+" : ""}{formatVal(delta)} un.
              </span>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Novo Valor</p>
              <p className={`text-lg font-bold tabular-nums ${isIncrease ? "text-emerald-700" : "text-red-600"}`}>
                {formatVal(pending.newValue)}
              </p>
            </div>
          </div>

          {/* Impact details */}
          <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Impacto Estimado</p>

            {/* Percentage change */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isIncrease
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  : <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                }
                <span className="text-xs text-foreground">Variação percentual</span>
              </div>
              <span className={`text-xs font-bold tabular-nums ${isIncrease ? "text-emerald-700" : "text-red-600"}`}>
                {pending.pctChange > 0 ? "+" : ""}{pending.pctChange.toFixed(1)}%
              </span>
            </div>

            {/* SKUs affected */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-[#0F4C75]" />
                <span className="text-xs text-foreground">SKUs afetados</span>
              </div>
              <span className="text-xs font-bold text-[#0F4C75] tabular-nums">
                {pending.skuCount} produto{pending.skuCount > 1 ? "s" : ""}
              </span>
            </div>

            {/* Trimestre impact */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs text-foreground">Impacto no Trimestre</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold tabular-nums ${pending.triDelta >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {pending.triDelta > 0 ? "+" : ""}{formatVal(pending.triDelta)} un.
                </span>
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({formatVal(pending.currentTriAtual)} → {formatVal(pending.newTriAtual)})
                </span>
              </div>
            </div>
          </div>

          {/* Warning for large changes */}
          {Math.abs(pending.pctChange) > 20 && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800">
                <span className="font-semibold">Atenção:</span> Este ajuste representa uma variação {Math.abs(pending.pctChange) > 50 ? "muito " : ""}significativa
                ({Math.abs(pending.pctChange).toFixed(1)}%). Verifique se o valor está correto antes de confirmar.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-[#F8FAFC] flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Enter para confirmar · Esc para cancelar
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-foreground bg-white border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 ${
                isIncrease
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Confirmar Ajuste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EditableQtdCell — Célula de quantidade editável inline
// ============================================================
interface EditableQtdCellProps {
  value: number | null;
  originalValue: number | null;
  isEdited: boolean;
  onSave: (newValue: number) => void;
  className?: string;
}

const EditableQtdCell = memo(function EditableQtdCell({ value, originalValue, isEdited, onSave, className = "" }: EditableQtdCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      confirmedRef.current = false;
    }
  }, [editing]);

  const handleStartEdit = () => {
    setEditValue(value !== null ? String(value) : "0");
    setEditing(true);
  };

  const doConfirm = () => {
    if (confirmedRef.current) return; // Prevent double-call from Enter+blur
    confirmedRef.current = true;
    const numVal = parseInt(editValue.replace(/\D/g, ""), 10);
    if (!isNaN(numVal) && numVal >= 0) {
      onSave(numVal);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    confirmedRef.current = true; // Prevent blur from triggering save
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      doConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (editing) {
    return (
      <td className={`px-1 py-1 border-l border-border/50 ${className}`}>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={doConfirm}
            className="w-full min-w-[70px] text-xs text-right font-semibold tabular-nums px-2 py-1 border border-[#0F4C75] rounded bg-[#0F4C75]/5 focus:ring-2 focus:ring-[#0F4C75]/30 outline-none"
          />
        </div>
      </td>
    );
  }

  // Compute delta for visual feedback
  const hasDelta = isEdited && originalValue !== null && value !== null && value !== originalValue;
  const deltaPercent = hasDelta && originalValue ? ((value! - originalValue) / originalValue * 100) : 0;

  return (
    <td
      onClick={handleStartEdit}
      className={`px-2 py-2 text-right font-semibold tabular-nums border-l border-border/50 cursor-pointer group relative transition-colors hover:bg-[#0F4C75]/[0.04] ${className} ${
        isEdited ? "bg-emerald-50/50" : ""
      }`}
      title={isEdited
        ? `Original: ${formatVal(originalValue)} · Ajustado: ${formatVal(value)} (${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(1)}%)\nClique para editar`
        : "Clique para editar"
      }
    >
      <div className="flex items-center justify-end gap-1">
        <span className={isEdited ? "text-emerald-700" : ""}>
          {formatVal(value)}
        </span>
        <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-opacity flex-shrink-0" />
      </div>
      {hasDelta && (
        <div className={`text-[9px] font-bold mt-0.5 ${deltaPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {deltaPercent > 0 ? "+" : ""}{deltaPercent.toFixed(1)}%
        </div>
      )}
    </td>
  );
});

// ============================================================
// Main Component
// ============================================================
export default function ComparisonTable() {
  const [comments, setComments] = useState<Record<string, string>>({});
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const { filteredComparison, isFiltered, appliedFilters } = useFilters();
  const { savedAdjustments, saveAdjustments, getSkuCountForItem, getMonthlyAdjustmentRatio, catN3toN4 } = useForecast();
  const hasCdFilter = appliedFilters.centroDistribuicao.length > 0;

  // Compute adjusted comparison data by applying saved adjustments (N3 + N4 + PRODUTO)
  // Uses getMonthlyAdjustmentRatio which already propagates N3 → N4
  const adjustedComparison = useMemo(() => {
    if (savedAdjustments.length === 0) return filteredComparison;

    return filteredComparison.map(row => {
      const ratio0 = getMonthlyAdjustmentRatio(row.categoria, "", MONTH_KEYS[0]);
      const ratio1 = getMonthlyAdjustmentRatio(row.categoria, "", MONTH_KEYS[1]);
      const ratio2 = getMonthlyAdjustmentRatio(row.categoria, "", MONTH_KEYS[2]);

      // If no adjustment affects this category, skip
      if (ratio0 === 1 && ratio1 === 1 && ratio2 === 1) return row;

      const originalRow = comparisonData.find(r => r.categoria === row.categoria);
      if (!originalRow) return row;

      const adjMes0 = Math.round((originalRow.mes0 ?? 0) * ratio0);
      const adjMes1 = Math.round((originalRow.mes1 ?? 0) * ratio1);
      const adjMes2 = Math.round((originalRow.mes2 ?? 0) * ratio2);

      const triAtual = adjMes0 + adjMes1 + adjMes2;

      const lyMes0 = (originalRow.varLY !== null && originalRow.mes0)
        ? originalRow.mes0 / (1 + originalRow.varLY / 100) : null;
      const lyMes1 = (originalRow.varLY1 !== null && originalRow.mes1)
        ? originalRow.mes1 / (1 + originalRow.varLY1 / 100) : null;
      const lyMes2 = (originalRow.varLY2 !== null && originalRow.mes2)
        ? originalRow.mes2 / (1 + originalRow.varLY2 / 100) : null;
      const lmMes0 = (originalRow.varLM !== null && originalRow.mes0)
        ? originalRow.mes0 / (1 + originalRow.varLM / 100) : null;

      const newVarLY = lyMes0 && lyMes0 > 0 ? ((adjMes0 / lyMes0) - 1) * 100 : originalRow.varLY;
      const newVarLY1 = lyMes1 && lyMes1 > 0 ? ((adjMes1 / lyMes1) - 1) * 100 : originalRow.varLY1;
      const newVarLY2 = lyMes2 && lyMes2 > 0 ? ((adjMes2 / lyMes2) - 1) * 100 : originalRow.varLY2;
      const newVarLM = lmMes0 && lmMes0 > 0 ? ((adjMes0 / lmMes0) - 1) * 100 : originalRow.varLM;

      const newVarTriLY = originalRow.triAnterior && originalRow.triAnterior > 0
        ? ((triAtual / originalRow.triAnterior) - 1) * 100 : originalRow.varTriLY;
      const newVarTriPenTri = originalRow.penTrimestre && originalRow.penTrimestre > 0
        ? ((triAtual / originalRow.penTrimestre) - 1) * 100 : originalRow.varTriPenTri;
      const newVarTriUltTri = originalRow.ultTrimestre && originalRow.ultTrimestre > 0
        ? ((triAtual / originalRow.ultTrimestre) - 1) * 100 : originalRow.varTriUltTri;

      return {
        ...row,
        mes0: adjMes0, mes1: adjMes1, mes2: adjMes2,
        varLY: newVarLY, varLY1: newVarLY1, varLY2: newVarLY2, varLM: newVarLM,
        triAtual, varTriLY: newVarTriLY, varTriPenTri: newVarTriPenTri, varTriUltTri: newVarTriUltTri,
      };
    });
  }, [filteredComparison, savedAdjustments, getMonthlyAdjustmentRatio]);

  // Track which categories have been edited (N4 direct + N4 children of N3)
  const editedCategories = useMemo(() => {
    const set = new Set<string>();
    for (const adj of savedAdjustments) {
      if (adj.level === "CATEGORIA NÍVEL 4") {
        set.add(adj.item);
      } else if (adj.level === "CATEGORIA NÍVEL 3") {
        const children = catN3toN4[adj.item] || [];
        for (const child of children) set.add(child);
      }
    }
    return set;
  }, [savedAdjustments, catN3toN4]);

  // Handle inline edit — opens confirmation modal instead of saving directly
  const handleInlineEditRequest = useCallback((categoria: string, monthKey: string, newValue: number) => {
    const originalRow = comparisonData.find(r => r.categoria === categoria);
    if (!originalRow) return;

    let originalMonthValue: number;
    if (monthKey === MONTH_KEYS[0]) originalMonthValue = originalRow.mes0 ?? 0;
    else if (monthKey === MONTH_KEYS[1]) originalMonthValue = originalRow.mes1 ?? 0;
    else originalMonthValue = originalRow.mes2 ?? 0;

    if (originalMonthValue === 0 && newValue === 0) return;

    const pctChange = originalMonthValue > 0
      ? ((newValue - originalMonthValue) / originalMonthValue) * 100
      : 0;

    if (Math.abs(pctChange) < 0.01 && newValue === originalMonthValue) return;

    // Get SKU count for this category
    const skuCount = getSkuCountForItem("CATEGORIA NÍVEL 4", categoria);

    // Calculate current trimestre and new trimestre
    const adjustedRow = adjustedComparison.find(r => r.categoria === categoria);
    const currentTriAtual = adjustedRow?.triAtual ?? ((originalRow.mes0 ?? 0) + (originalRow.mes1 ?? 0) + (originalRow.mes2 ?? 0));

    // New trimestre: replace the edited month value
    let newTriAtual = currentTriAtual;
    if (monthKey === MONTH_KEYS[0]) {
      newTriAtual = newValue + (adjustedRow?.mes1 ?? originalRow.mes1 ?? 0) + (adjustedRow?.mes2 ?? originalRow.mes2 ?? 0);
    } else if (monthKey === MONTH_KEYS[1]) {
      newTriAtual = (adjustedRow?.mes0 ?? originalRow.mes0 ?? 0) + newValue + (adjustedRow?.mes2 ?? originalRow.mes2 ?? 0);
    } else {
      newTriAtual = (adjustedRow?.mes0 ?? originalRow.mes0 ?? 0) + (adjustedRow?.mes1 ?? originalRow.mes1 ?? 0) + newValue;
    }

    setPendingEdit({
      categoria,
      monthKey,
      newValue,
      originalMonthValue,
      pctChange,
      skuCount,
      currentTriAtual,
      newTriAtual,
      triDelta: newTriAtual - currentTriAtual,
    });
  }, [adjustedComparison, getSkuCountForItem]);

  // Confirm the pending edit — actually save the adjustment
  const handleConfirmEdit = useCallback(() => {
    if (!pendingEdit) return;

    const { categoria, monthKey, newValue, originalMonthValue, pctChange } = pendingEdit;

    const originalRow = comparisonData.find(r => r.categoria === categoria);
    if (!originalRow) { setPendingEdit(null); return; }

    const monthlyValues: Record<string, number> = {};
    for (const m of MONTH_KEYS) { monthlyValues[m] = 0; }
    monthlyValues[monthKey] = pctChange;

    const remainingMonths = DATA_BOUNDARIES.forecastMonths.filter(m => !MONTH_KEYS.includes(m));
    for (const m of remainingMonths) { monthlyValues[m] = 0; }

    const adjustment: SavedAdjustment = {
      id: `inline-${categoria}-${monthKey}-${Date.now()}`,
      level: "CATEGORIA NÍVEL 4",
      item: categoria,
      type: "%",
      monthlyValues,
      previsaoOriginal: originalMonthValue,
      previsaoAjustada: newValue,
      timestamp: new Date().toISOString(),
      usuario: DEFAULT_USER,
      exported: false,
      exportedAt: null,
    };

    saveAdjustments([adjustment]);
    setPendingEdit(null);
  }, [pendingEdit, savedAdjustments, saveAdjustments]);

  // Cancel the pending edit
  const handleCancelEdit = useCallback(() => {
    setPendingEdit(null);
  }, []);

  // Get original values for comparison (to show delta)
  const getOriginalValue = useCallback((categoria: string, monthIdx: number): number | null => {
    const originalRow = comparisonData.find(r => r.categoria === categoria);
    if (!originalRow) return null;
    if (monthIdx === 0) return originalRow.mes0;
    if (monthIdx === 1) return originalRow.mes1;
    return originalRow.mes2;
  }, []);

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm">
      {/* Confirmation Modal */}
      {pendingEdit && (
        <ConfirmationModal
          pending={pendingEdit}
          onConfirm={handleConfirmEdit}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0F4C75]/10">
            <Table2 className="w-4 h-4 text-[#0F4C75]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Comparativo Mensal e Trimestral</h2>
            <p className="text-[11px] text-muted-foreground">
              Análise por Categoria Nível 4 · {adjustedComparison.length} categorias
              {isFiltered && <span className="text-[#0F4C75] font-semibold ml-1">(filtrado)</span>}
              {hasCdFilter && <span className="text-amber-600 font-semibold ml-1">· Dados agregados (todos os CDs) — granularidade por CD disponível na versão conectada ao Datalake</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Confidence summary badges */}
          {(() => {
            const counts = { alta: 0, media: 0, baixa: 0 };
            for (const row of adjustedComparison) {
              const c = confidenceMap.get(row.categoria);
              if (c) counts[c.level]++;
            }
            return (
              <>
                {counts.baixa > 0 && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {counts.baixa} baixa conf.
                  </span>
                )}
                {counts.media > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldQuestion className="w-3 h-3" />
                    {counts.media} média conf.
                  </span>
                )}
                {counts.alta > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {counts.alta} alta conf.
                  </span>
                )}
              </>
            );
          })()}
          {editedCategories.size > 0 && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              {editedCategories.size} categoria{editedCategories.size > 1 ? "s" : ""} ajustada{editedCategories.size > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Instruction banner */}
      <div className="px-5 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2">
        <Pencil className="w-3.5 h-3.5 text-[#0F4C75]/60 flex-shrink-0" />
        <p className="text-[11px] text-[#0F4C75]/80">
          <span className="font-semibold">Edição inline:</span> Clique nos valores de <span className="font-semibold">Qtd</span> dos meses para ajustar. Um resumo do impacto será exibido para confirmação antes de salvar.
        </p>
      </div>

      {/* Table with fixed height for ~15 rows */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="max-h-[540px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-border bg-[#F8FAFC]">
                <th className="sticky left-0 z-30 bg-[#F8FAFC] px-3 py-2" rowSpan={2}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cat. Nível 4</span>
                </th>
                <th colSpan={3} className="px-2 py-1.5 text-center bg-[#0F4C75]/5 border-l border-border">
                  <span className="text-[10px] font-bold text-[#0F4C75] uppercase tracking-wider">{MONTH_LABELS_MAP[MONTH_KEYS[0]]}</span>
                </th>
                <th colSpan={2} className="px-2 py-1.5 text-center bg-[#0F4C75]/5 border-l border-border">
                  <span className="text-[10px] font-bold text-[#0F4C75] uppercase tracking-wider">{MONTH_LABELS_MAP[MONTH_KEYS[1]]}</span>
                </th>
                <th colSpan={2} className="px-2 py-1.5 text-center bg-[#0F4C75]/5 border-l border-border">
                  <span className="text-[10px] font-bold text-[#0F4C75] uppercase tracking-wider">{MONTH_LABELS_MAP[MONTH_KEYS[2]]}</span>
                </th>
                <th colSpan={7} className="px-2 py-1.5 text-center bg-amber-50 border-l border-border">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Trimestre</span>
                </th>
                <th className="px-2 py-1.5 text-center border-l border-border bg-[#F8FAFC]" rowSpan={2}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <MessageSquare className="w-3 h-3 inline-block mr-1" />
                    Obs.
                  </span>
                </th>
              </tr>
              <tr className="border-b-2 border-border bg-[#F8FAFC]">
                <th className="px-2 py-1.5 text-right border-l border-border bg-[#F8FAFC]">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center justify-end gap-1">
                    Qtd <Pencil className="w-2.5 h-2.5 text-[#0F4C75]/40" />
                  </span>
                </th>
                <th className="px-2 py-1.5 text-center bg-[#F8FAFC]"><span className="text-[10px] font-semibold text-muted-foreground">%LY</span></th>
                <th className="px-2 py-1.5 text-center bg-[#F8FAFC]"><span className="text-[10px] font-semibold text-muted-foreground">%LM</span></th>
                <th className="px-2 py-1.5 text-right border-l border-border bg-[#F8FAFC]">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center justify-end gap-1">
                    Qtd <Pencil className="w-2.5 h-2.5 text-[#0F4C75]/40" />
                  </span>
                </th>
                <th className="px-2 py-1.5 text-center bg-[#F8FAFC]"><span className="text-[10px] font-semibold text-muted-foreground">%LY</span></th>
                <th className="px-2 py-1.5 text-right border-l border-border bg-[#F8FAFC]">
                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center justify-end gap-1">
                    Qtd <Pencil className="w-2.5 h-2.5 text-[#0F4C75]/40" />
                  </span>
                </th>
                <th className="px-2 py-1.5 text-center bg-[#F8FAFC]"><span className="text-[10px] font-semibold text-muted-foreground">%LY</span></th>
                <th className="px-2 py-1.5 text-right border-l border-border bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">Ano Anterior</span></th>
                <th className="px-2 py-1.5 text-right bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">Penúltimo</span></th>
                <th className="px-2 py-1.5 text-right bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">Último</span></th>
                <th className="px-2 py-1.5 text-right bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">Atual</span></th>
                <th className="px-2 py-1.5 text-center bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">%LY</span></th>
                <th className="px-2 py-1.5 text-center bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">%Penúlt.</span></th>
                <th className="px-2 py-1.5 text-center bg-amber-50"><span className="text-[10px] font-semibold text-amber-800">%Últ</span></th>
              </tr>
            </thead>
            <tbody>
              {adjustedComparison.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhuma categoria encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                adjustedComparison.map((row, idx) => {
                  const isEdited = editedCategories.has(row.categoria);
                  return (
                    <tr
                      key={`${row.categoria}-${idx}`}
                      className={`border-b border-border/50 transition-colors ${
                        isEdited
                          ? "bg-emerald-50/30 hover:bg-emerald-50/50"
                          : idx % 2 === 0
                            ? "bg-white hover:bg-[#0F4C75]/[0.02]"
                            : "bg-[#F8FAFC]/50 hover:bg-[#0F4C75]/[0.02]"
                      }`}
                    >
                      <td className={`sticky left-0 z-10 px-3 py-2 font-semibold text-foreground whitespace-nowrap text-xs ${
                        isEdited ? "bg-emerald-50/30" : idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/50"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {isEdited && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                          <ConfidenceBadge categoria={row.categoria} />
                          <span className="flex-shrink-0">{row.categoria}</span>
                          <Sparkline categoria={row.categoria} />
                        </div>
                      </td>
                      {/* Mês 0 — Editable */}
                      <EditableQtdCell
                        value={row.mes0}
                        originalValue={getOriginalValue(row.categoria, 0)}
                        isEdited={isEdited}
                        onSave={(newVal) => handleInlineEditRequest(row.categoria, MONTH_KEYS[0], newVal)}
                      />
                      <VarCell value={row.varLY} />
                      <VarCell value={row.varLM} />
                      {/* Mês 1 — Editable */}
                      <EditableQtdCell
                        value={row.mes1}
                        originalValue={getOriginalValue(row.categoria, 1)}
                        onSave={(newVal) => handleInlineEditRequest(row.categoria, MONTH_KEYS[1], newVal)}
                        isEdited={isEdited}
                      />
                      <VarCell value={row.varLY1} />
                      {/* Mês 2 — Editable */}
                      <EditableQtdCell
                        value={row.mes2}
                        originalValue={getOriginalValue(row.categoria, 2)}
                        onSave={(newVal) => handleInlineEditRequest(row.categoria, MONTH_KEYS[2], newVal)}
                        isEdited={isEdited}
                      />
                      <VarCell value={row.varLY2} />
                      {/* Trimestre */}
                      <td className="px-2 py-2 text-right tabular-nums border-l border-border/50 bg-amber-50/30">{formatVal(row.triAnterior)}</td>
                      <td className="px-2 py-2 text-right tabular-nums bg-amber-50/30">{formatVal(row.penTrimestre)}</td>
                      <td className="px-2 py-2 text-right tabular-nums bg-amber-50/30">{formatVal(row.ultTrimestre)}</td>
                      <td className={`px-2 py-2 text-right font-bold tabular-nums bg-amber-50/30 ${isEdited ? "text-emerald-700" : ""}`}>
                        {formatVal(row.triAtual)}
                      </td>
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums bg-amber-50/30 ${
                        (row.varTriLY ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}>
                        {formatPct(row.varTriLY)}
                      </td>
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums bg-amber-50/30 ${
                        (row.varTriPenTri ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}>
                        {formatPct(row.varTriPenTri)}
                      </td>
                      <td className={`px-2 py-2 text-center font-semibold tabular-nums bg-amber-50/30 ${
                        (row.varTriUltTri ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}>
                        {formatPct(row.varTriUltTri)}
                      </td>
                      {/* Comentários */}
                      <td className="px-2 py-2 border-l border-border/50">
                        <input
                          type="text"
                          placeholder="..."
                          value={comments[row.categoria] || ""}
                          onChange={(e) => setComments({ ...comments, [row.categoria]: e.target.value })}
                          className="w-full min-w-[100px] text-xs px-2 py-1 border-0 bg-transparent hover:bg-accent focus:bg-white focus:ring-1 focus:ring-[#0F4C75]/20 rounded outline-none transition-all"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
