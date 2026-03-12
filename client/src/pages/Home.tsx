/*
  Home Page — Clean Pharma Analytics
  Dashboard principal com:
  1. Header (com filtro de período)
  2. KPI Cards
  3. Filtros (funcionais com FilterContext)
  4. Gráfico de linha (Histórico + Previsão + Previsão Ajustada)
  5. Tabela comparativa mensal/trimestral (scroll 15 linhas)
  6. Tabela de produtos (scroll 15 linhas)
  7. Tabela de ajustes colaborativos (com colunas mês a mês)
  8. Log de auditoria
  
  PROVIDERS:
  - PeriodProvider (mais externo) — gerencia período selecionado
  - ForecastProvider — gerencia ajustes e produtos ajustados
  - FilterProvider — gerencia filtros e dados filtrados
*/
import Header from "@/components/Header";
import KpiCards from "@/components/KpiCards";
import Filters from "@/components/Filters";
import SalesChart from "@/components/SalesChart";
import ComparisonTable from "@/components/ComparisonTable";
import ProductTable from "@/components/ProductTable";
import AdjustmentTable from "@/components/AdjustmentTable";
import SupplierAdjustment from "@/components/SupplierAdjustment";
import AuditLog from "@/components/AuditLog";
import { ForecastProvider, useForecast } from "@/contexts/ForecastContext";
import { FilterProvider } from "@/contexts/FilterContext";
import { PeriodProvider } from "@/contexts/PeriodContext";
import { Clock, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Suspense, lazy } from "react";
const ExportButtons = lazy(() => import("@/components/ExportButtons"));
const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0, 0, 0.2, 1] as const },
};

const HERO_IMAGE = "https://private-us-east-1.manuscdn.com/sessionFile/VTyoKREyuS4is6fu4oFsds/sandbox/kEGlTzd248q42vkDQdLC8w-img-1_1770561349000_na1fn_aGVyby1iYW5uZXI.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvVlR5b0tSRXl1UzRpczZmdTRvRnNkcy9zYW5kYm94L2tFR2xUemQyNDhxNDJ2a0RRZExDOHctaW1nLTFfMTc3MDU2MTM0OTAwMF9uYTFmbl9hR1Z5YnkxaVlXNXVaWEkucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=UPTG06XGPy-f2zK6feXped7DK7m5YVW8QjAZ~pBFzJ3UnjuJgy~ok-oTC4LnBTt~SGdNiUY-HosI1U4fPrt08yddVIDKY4~RIB53Izm53IQ79bZdIOvVHeI4HLPGI1k-F0xSfP7W~DfcoQO0J7ZEVZum32XTorTtsJqAXSHso4yyK5Xura1OgG4oIbERoYuVVJC0~YcfOJgS3mbiySUjWeDubaz~f3~0SChYPCT6-rpT57KfYD1lzO56bEK~qLuWjqMd0TcA1cPOsU5QNeSEp3rxzu2cL6no-2g0c-QTtM12L-CeTv8zqEgwmdRN1jkLiTZESqVlitey9vbOEPdp0g__";

export default function Home() {
  return (
    <PeriodProvider>
      <ForecastProvider>
        <HomeContent />
      </ForecastProvider>
    </PeriodProvider>
  );
}

function HomeContent() {
  return (
    <FilterProvider>
      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero banner */}
        <div className="relative h-32 overflow-hidden">
          <img
            src={HERO_IMAGE}
            alt="Painel de Previsão Colaborativa"
            loading="lazy"
            decoding="async"
            width={1920}
            height={480}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F4C75]/80 via-[#0F4C75]/50 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Painel de Previsão Colaborativa
              </h2>
              <p className="text-sm text-white/80 mt-0.5 font-medium">
                Visualize, analise e ajuste as previsões de vendas em tempo real
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="px-6 py-5 space-y-5 max-w-[1440px] mx-auto">
          {/* Info bar */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
              <Info className="w-3.5 h-3.5" />
              <span>
                Dados carregados do Datalake · Última atualização:{" "}
                <span className="font-semibold text-foreground">08/02/2026 às 09:30</span>
              </span>
            </div>
            <Suspense fallback={<div className="h-9 w-64 bg-muted animate-pulse rounded-md" />}>
              <ExportButtons />
            </Suspense>
          </div>

          {/* KPI Cards */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.05 }}>
            <KpiCards />
          </motion.div>

          {/* Filters */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }}>
            <Filters />
          </motion.div>

          {/* Sales Chart */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.15 }}>
            <SalesChart />
          </motion.div>

          {/* Comparison Table (Cat N4) */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.2 }}>
            <ComparisonTable />
          </motion.div>

          {/* Product Table (SKU level) */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.22 }}>
            <ProductTable />
          </motion.div>

          {/* Adjustment Table */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.25 }}>
            <AdjustmentTable />
          </motion.div>

          {/* Supplier Adjustment */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.27 }}>
            <SupplierAdjustment />
          </motion.div>

          {/* Audit Log */}
          <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.3 }}>
            <AuditLog />
          </motion.div>

          {/* Footer */}
          <footer className="flex items-center justify-between py-4 border-t border-border text-xs text-muted-foreground">
            <span>Previsão de Vendas Colaborativa v1.0 · Plataforma Interna</span>
            <span>Desenvolvido para a equipe comercial</span>
          </footer>
        </main>
      </div>
    </FilterProvider>
  );
}
