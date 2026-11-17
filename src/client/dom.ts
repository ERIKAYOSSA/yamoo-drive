/** Récupère un élément par id (erreur claire si absent). */
export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Élément #${id} introuvable`);
  return node as T;
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Échappe le texte avant de l'insérer dans du HTML. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
