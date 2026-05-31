import DOMPurify from "isomorphic-dompurify";

// ── Configuraciones ───────────────────────────────────────────

// Contenido de rich-text admin (TipTap, editors): permite HTML semántico,
// bloquea <script>, <iframe>, on*, href="javascript:" y data URIs.
const RICH_TEXT_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "mark",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a", "blockquote", "pre", "code",
    "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "target", "rel", "width", "height", "colspan", "rowspan"],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS:  ["script", "iframe", "object", "embed", "form", "input", "button", "link", "meta"],
  FORBID_ATTR:  ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
};

// ── Funciones públicas ────────────────────────────────────────

/**
 * Sanitiza HTML de rich-text proveniente del admin (eventos, campañas, landing pages).
 * Elimina scripts, iframes y atributos de eventos JS manteniendo el formato visual.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, RICH_TEXT_CONFIG);
}

/**
 * Escapa caracteres HTML especiales en texto plano para insertarlo
 * de forma segura dentro de templates HTML (emails, etc.).
 * Úsalo para: nombres, emails, direcciones, números de orden.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}

/**
 * Valida que una URL de redirección sea segura (solo rutas relativas).
 * Bloquea: URLs absolutas (https://evil.com), protocol-relative (//evil.com),
 * javascript: URIs, y data: URIs.
 */
export function isSafeRedirectUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("//"))           return false; // protocol-relative
  if (/^javascript:/i.test(url))      return false; // JS URI
  if (/^data:/i.test(url))            return false; // data URI
  if (url.startsWith("/"))            return true;  // ruta relativa ✓
  return false; // URL absoluta → rechazar
}

/**
 * Valida y trunca texto de entrada del usuario para prevenir DoS
 * por strings demasiado largos y ataques de inyección de campos.
 */
export function sanitizeText(
  text: string | null | undefined,
  maxLength = 500,
): string {
  if (!text) return "";
  return text.trim().slice(0, maxLength);
}
