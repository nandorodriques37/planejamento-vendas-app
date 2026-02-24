/*
  ExportButtons — Botões de exportação Excel e PDF

  Coleta dados do FilterContext e KpiCards para gerar relatórios.
  Posicionado na barra de informações do dashboard.
*/
import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/contexts/FilterContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { useShallow } from "zustand/react/shallow";
import { exportToExcel } from "@/lib/exportExcel";
import { exportToPdf } from "@/lib/exportPdf";
import { DEFAULT_USER } from "@/lib/constants";
import { useKpiValues } from "@/hooks/useKpiValues";
import { toast } from "sonner";

export default function ExportButtons() {
  const {
    filteredProducts,
    filteredComparison,
    filteredMonthlyData,
    appliedFilters,
    isFiltered,
  } = useFilters(useShallow(state => ({
    filteredProducts: state.filteredProducts,
    filteredComparison: state.filteredComparison,
    filteredMonthlyData: state.filteredMonthlyData,
    appliedFilters: state.appliedFilters,
    isFiltered: state.isFiltered
  })));
  const { startMonth, endMonth } = usePeriod();

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const kpiValues = useKpiValues(filteredMonthlyData, filteredProducts, isFiltered);

  const getExportKpis = () => {
    const adjustedCount = filteredProducts.filter(p => p.forecast !== p.originalForecast).length;
    const totalProducts = filteredProducts.length;
    return {
      vendaMesAtual: kpiValues.mesAtual,
      vendaMesAtualVar: kpiValues.varMensal,
      previsaoProxMes: kpiValues.proxMes,
      previsaoProxMesVar: kpiValues.varProxMes,
      trimestreAtual: kpiValues.trimestre,
      ajustesRealizados: `${adjustedCount} / ${totalProducts}`,
    };
  };

  const getFilterLabels = (): Record<string, string> => {
    const labels: Record<string, string> = {};
    if (appliedFilters.codigoProduto) labels["Código Produto"] = appliedFilters.codigoProduto;
    if (appliedFilters.categoriaN3.length > 0) labels["Categoria N3"] = appliedFilters.categoriaN3.join(", ");
    if (appliedFilters.categoriaN4.length > 0) labels["Categoria N4"] = appliedFilters.categoriaN4.join(", ");
    if (appliedFilters.centroDistribuicao.length > 0) labels["Centro Distribuição"] = appliedFilters.centroDistribuicao.join(", ");
    if (appliedFilters.comprador.length > 0) labels["Comprador"] = appliedFilters.comprador.join(", ");
    if (appliedFilters.fornecedor.length > 0) labels["Fornecedor"] = appliedFilters.fornecedor.join(", ");
    return labels;
  };

  const now = new Date();
  const dataExportacao = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const kpis = getExportKpis();
      exportToExcel({
        ...kpis,
        filtrosAtivos: getFilterLabels(),
        monthlyData: filteredMonthlyData,
        comparisonData: filteredComparison,
        products: filteredProducts,
        periodo: `${startMonth} — ${endMonth}`,
        comprador: DEFAULT_USER,
        dataExportacao,
      });
      toast.success("Excel exportado com sucesso!", {
        description: `${filteredProducts.length} produtos · ${filteredComparison.length} categorias`,
      });
    } catch (err) {
      void err;
      toast.error("Erro ao exportar Excel", {
        description: "Tente novamente ou entre em contato com o suporte.",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const kpis = getExportKpis();
      await exportToPdf({
        ...kpis,
        filtrosAtivos: getFilterLabels(),
        monthlyData: filteredMonthlyData,
        comparisonData: filteredComparison,
        periodo: `${startMonth} — ${endMonth}`,
        comprador: DEFAULT_USER,
        dataExportacao,
        chartElementId: "sales-chart-container",
      });
      toast.success("PDF exportado com sucesso!", {
        description: `Relatório com ${filteredComparison.length} categorias`,
      });
    } catch (err) {
      void err;
      toast.error("Erro ao exportar PDF", {
        description: "Tente novamente ou entre em contato com o suporte.",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={exportingExcel}
        className="h-8 gap-1.5 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
      >
        {exportingExcel ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5" />
        )}
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPdf}
        disabled={exportingPdf}
        className="h-8 gap-1.5 text-xs font-medium border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
      >
        {exportingPdf ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        PDF
      </Button>
      {isFiltered && (
        <span className="text-[10px] text-muted-foreground ml-1">
          (dados filtrados)
        </span>
      )}
    </div>
  );
}
