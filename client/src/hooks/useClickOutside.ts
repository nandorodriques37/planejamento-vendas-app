import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * Hook que detecta cliques fora de um elemento e executa um callback.
 * Substitui o padrão repetido de document.addEventListener("mousedown", ...).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void
): void {
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onClickOutside]);
}
