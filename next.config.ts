import type { NextConfig } from "next";

// ── HTTP Security Headers ─────────────────────────────────────
// Aplicados a todas las rutas para protección contra ataques comunes.

// ── Content-Security-Policy ───────────────────────────────────
// ISO 27001 A.13.1 — Network Security Controls
// Permitimos 'unsafe-inline' en styles por Tailwind CSS.
// Para scripts, solo se permite el origen propio + pasarelas de pago.
const cspDirectives = [
  "default-src 'self'",
  // Scripts: propio + APIs de pago + Analytics (agregar si usas GA/GTM)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.mercadopago.com https://sdk.mercadopago.com https://www.flow.cl",
  // Estilos: propio + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fuentes: propio + Google Fonts
  "font-src 'self' https://fonts.gstatic.com data:",
  // Imágenes: cualquier HTTPS (CDN de imágenes de productos)
  "img-src 'self' data: blob: https:",
  // Conexiones API
  "connect-src 'self' https://api.mercadopago.com https://www.flow.cl https://sandbox.flow.cl",
  // Iframes: Google Maps + pasarelas de pago
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.mercadopago.com https://www.flow.cl https://sandbox.flow.cl",
  // Formularios: solo propio
  "form-action 'self'",
  // Base URI: solo propio
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  // ISO 27001 A.13.1.3 — CSP previene XSS y data injection
  { key: "Content-Security-Policy", value: cspDirectives },

  // Evita que el navegador adivine el Content-Type (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Impide que la página se cargue dentro de un <iframe> (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Controla qué información de referrer se envía al navegar
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Deshabilita APIs del navegador que no se usan
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self https://www.mercadopago.com https://www.flow.cl)" },

  // Fuerza HTTPS por 1 año en producción (incluye subdominios) — ISO 27001 A.10.1
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },

  async headers() {
    return [
      // Service Worker — sin cambios
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type",           value: "application/javascript; charset=UTF-8" },
          { key: "Cache-Control",          value: "no-cache, no-store, must-revalidate"   },
          { key: "Service-Worker-Allowed", value: "/"                                     },
        ],
      },
      // Security headers en todas las rutas
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
