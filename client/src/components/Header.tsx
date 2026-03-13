/*
  Header Component — Clean Pharma Analytics
  Barra superior com logo, título, filtro de período e informações do usuário
  
  FILTRO DE PERÍODO:
  - Dois dropdowns para selecionar mês início e mês fim
  - Atualiza o PeriodContext que controla as colunas da tabela de ajustes
*/
import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { BarChart3, Bell, User, Calendar, ChevronDown } from "lucide-react";
import { DEFAULT_USER } from "@/lib/constants";
import { usePeriod } from "@/contexts/PeriodContext";
import { getPeriodDescriptionWithCount } from "@/lib/dateUtils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { startMonth, endMonth, activeMonths, monthOptions, setStartMonth, setEndMonth, periodLabel } = usePeriod();
  const [openDropdown, setOpenDropdown] = useState<"start" | "end" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();

  // Close dropdown when clicking outside
  useClickOutside(dropdownRef, useCallback(() => setOpenDropdown(null), []));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Logo & Title */}
        <Link href="/">
          <a className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-primary leading-tight tracking-tight">
                Previsão de Vendas
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium leading-tight">
                Plataforma Colaborativa
              </p>
            </div>
          </a>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Period selector */}
          <div ref={dropdownRef} className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Período:</span>

            {/* Start month dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === "start" ? null : "start")}
                className="flex items-center gap-1 h-7 px-2.5 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
              >
                {startMonth}
                <ChevronDown className="w-3 h-3" />
              </button>
              {openDropdown === "start" && (
                <div className="absolute top-full left-0 mt-1 w-28 bg-white border border-border rounded-lg shadow-lg z-[100] max-h-48 overflow-auto custom-scrollbar">
                  {monthOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setStartMonth(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${opt.value === startMonth ? "bg-primary/5 text-primary font-semibold" : ""
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-xs text-muted-foreground">—</span>

            {/* End month dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === "end" ? null : "end")}
                className="flex items-center gap-1 h-7 px-2.5 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
              >
                {endMonth}
                <ChevronDown className="w-3 h-3" />
              </button>
              {openDropdown === "end" && (
                <div className="absolute top-full right-0 mt-1 w-28 bg-white border border-border rounded-lg shadow-lg z-[100] max-h-48 overflow-auto custom-scrollbar">
                  {monthOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setEndMonth(opt.value); setOpenDropdown(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${opt.value === endMonth ? "bg-primary/5 text-primary font-semibold" : ""
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {activeMonths.length} mês(es)
            </span>
          </div>

          <div className="h-6 w-px bg-border" />
          <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#059669] rounded-full" />
          </button>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-black/5 p-1 px-2 rounded-md transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold leading-tight capitalize">{user?.name || "Usuário"}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{user?.email || "usuario@email.com"}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === "admin" && (
                  <>
                    <Link href="/">
                      <DropdownMenuItem className="cursor-pointer font-medium">
                        Página Inicial
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer text-primary font-medium">
                        Painel Admin
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem disabled>
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
