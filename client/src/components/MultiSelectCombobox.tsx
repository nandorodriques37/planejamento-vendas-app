/*
  MultiSelectCombobox — Dropdown com seleção múltipla e busca por digitação
  
  Funcionalidades:
  - Campo de busca com filtragem em tempo real
  - Checkboxes para seleção múltipla
  - Badges mostrando itens selecionados com botão X individual
  - Contagem de resultados filtrados
  - Navegação por teclado (setas + Enter para toggle)
  - Botão "Selecionar Todos" / "Limpar Todos"
  - Destaque do texto digitado em amarelo
*/
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

interface MultiSelectComboboxProps {
  label: string;
  options: string[];
  placeholder: string;
  values: string[];
  onChange: (vals: string[]) => void;
}

/** Highlight matching text in option */
function HighlightMatch({ text, search }: { text: string; search: string }) {
  if (!search.trim()) return <span className="truncate">{text}</span>;

  const term = search.toLowerCase().trim();
  const idx = text.toLowerCase().indexOf(term);
  if (idx === -1) return <span className="truncate">{text}</span>;

  return (
    <span className="truncate">
      {text.slice(0, idx)}
      <span className="bg-yellow-200/70 text-foreground font-semibold rounded-sm px-0.5">
        {text.slice(idx, idx + term.length)}
      </span>
      {text.slice(idx + term.length)}
    </span>
  );
}

export default function MultiSelectCombobox({
  label,
  options,
  placeholder,
  values,
  onChange,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter options based on search text
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(term));
  }, [options, search]);

  // Handle keyboard navigation
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [search, open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
        toggleOption(filteredOptions[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  }

  function toggleOption(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  }

  function removeValue(opt: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(values.filter(v => v !== opt));
  }

  function handleClearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
    setSearch("");
  }

  function handleSelectAllFiltered() {
    const newValues = new Set(values);
    filteredOptions.forEach(opt => newValues.add(opt));
    onChange(Array.from(newValues));
  }

  function handleDeselectAllFiltered() {
    const toRemove = new Set(filteredOptions);
    onChange(values.filter(v => !toRemove.has(v)));
  }

  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(opt => values.includes(opt));

  // Display text for trigger button
  const displayText = values.length === 0
    ? placeholder
    : values.length === 1
      ? values[0]
      : `${values.length} selecionado(s)`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </label>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full min-w-[180px] h-9 px-3 text-sm bg-white border rounded-lg transition-colors ${
          open
            ? "border-[#0F4C75] ring-1 ring-[#0F4C75]/20"
            : values.length > 0
              ? "border-[#0F4C75]/40 bg-[#0F4C75]/[0.02]"
              : "border-border hover:border-[#0F4C75]/30"
        }`}
      >
        <span className={`truncate ${values.length > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {displayText}
        </span>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {values.length > 0 && (
            <>
              <span className="text-[10px] font-bold text-white bg-[#0F4C75] px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {values.length}
              </span>
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClearAll}
                className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Selected badges (shown below trigger when items are selected) */}
      {values.length > 0 && values.length <= 3 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {values.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0F4C75]/10 text-[#0F4C75] text-[10px] font-semibold max-w-[160px]"
            >
              <span className="truncate">{val}</span>
              <button
                onClick={(e) => removeValue(val, e)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-[#0F4C75]/20 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown with search */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[260px] bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-accent/50 border border-border rounded-md focus:border-[#0F4C75] focus:ring-1 focus:ring-[#0F4C75]/20 outline-none transition-all placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-muted-foreground">
                {search
                  ? `${filteredOptions.length} resultado${filteredOptions.length !== 1 ? "s" : ""} de ${options.length}`
                  : `${values.length} de ${options.length} selecionado${values.length !== 1 ? "s" : ""}`
                }
              </p>
              <button
                onClick={allFilteredSelected ? handleDeselectAllFiltered : handleSelectAllFiltered}
                className="text-[10px] font-semibold text-[#0F4C75] hover:text-[#0F4C75]/70 transition-colors"
              >
                {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-auto custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">Nenhum resultado para</p>
                <p className="text-sm font-medium text-foreground mt-0.5">"{search}"</p>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = values.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#0F4C75]/5"
                        : highlightIndex === idx
                          ? "bg-accent"
                          : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {/* Checkbox visual */}
                    <span className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "bg-[#0F4C75] border-[#0F4C75]"
                        : "border-border"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <HighlightMatch text={opt} search={search} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
