export const PIPELINE_STAGES = [
  { key: "NEW",             label: "Nuevo",                 color: "bg-gray-100 text-gray-600",    dot: "bg-gray-400"   },
  { key: "CONTACT_ATTEMPT", label: "Intento de contacto",  color: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-400" },
  { key: "CONTACTED",       label: "Contactado",            color: "bg-blue-50 text-blue-700",     dot: "bg-blue-400"   },
  { key: "FOLLOW_UP",       label: "En seguimiento",        color: "bg-purple-50 text-purple-700", dot: "bg-purple-400" },
  { key: "QUALIFIED",       label: "Calificado",            color: "bg-orange-50 text-orange-700", dot: "bg-orange-400" },
  { key: "CALL_SCHEDULED",  label: "Llamada agendada",      color: "bg-teal-50 text-teal-700",     dot: "bg-teal-400"   },
  { key: "WON",             label: "Ganado",                color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { key: "LOST",            label: "Perdido",               color: "bg-red-50 text-red-600",       dot: "bg-red-400"    },
] as const;

export type StageKey = typeof PIPELINE_STAGES[number]["key"];

export const SOURCE_LABELS: Record<string, string> = {
  MANUAL:       "Manual",
  LANDING_PAGE: "Landing page",
  REFERRAL:     "Referido",
  SOCIAL:       "Redes sociales",
  OTHER:        "Otro",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  NOTE:         "Nota",
  CALL:         "Llamada",
  EMAIL:        "Correo",
  WHATSAPP:     "WhatsApp",
  STAGE_CHANGE: "Cambio de etapa",
};

export type LandingPageConfig = {
  headline:         string;
  subheadline:      string;
  bodyText:         string;
  heroImage:        string | null;
  accentColor:      string;
  bgColor:          string;

  formTitle:        string;
  formSubtitle:     string;
  ctaLabel:         string;
  thankYouTitle:    string;
  thankYouText:     string;

  collectName:      boolean;
  collectEmail:     boolean;
  collectPhone:     boolean;
  collectWhatsapp:  boolean;
  requirePhone:     boolean;
  requireEmail:     boolean;
  autoTags:         string[];

  showFeatures:     boolean;
  features:         { title: string; text: string }[];
  featuresImage:    string | null;

  showSocialProof:  boolean;
  socialProofCount: string;
  socialProofText:  string;

  showProducts:            boolean;
  productMode:             "COLLECTION" | "MANUAL";
  productIds:              string[];
  collectionSlug:          string | null;
  productCtaLabel:         string;
  requireLeadBeforeStore:  boolean;

  showForm:                boolean;

  customHeadHtml:          string;
  customBodyHtml:          string;

  showVideo:               boolean;
  videoUrl:                string | null;
  videoOrientation:        "horizontal" | "vertical";
  videoPosition:           "after_hero" | "after_benefits" | "after_social" | "after_products";
  videoTitle:              string;
  videoCaption:            string;
};

// ── Event Landing Page config ─────────────────────────────────

export type EventConfig = {
  // Design
  headline:         string;
  subheadline:      string;
  bodyText:         string;
  heroImage:        string | null;
  gallery:          string[];
  accentColor:      string;
  bgColor:          string;
  sectionOrder?:    string[];   // ordered keys: video|description|community|map|features|gallery|socialProof

  // Event details
  eventType:        "IN_PERSON" | "ONLINE" | "HYBRID";
  eventDate:        string;          // "YYYY-MM-DD"
  eventTime:        string;          // "HH:MM"
  eventEndTime:     string;          // "HH:MM"
  eventLocation:    string;
  eventLocationUrl: string;          // Google Maps or meeting URL
  eventCapacity:    number;          // 0 = unlimited

  // Multi-day support
  eventEndDate:      string;         // YYYY-MM-DD, empty = single day

  // Pricing
  ticketMode:        "FREE" | "PAID" | "PAID_BY_DAY";
  ticketPrice:       number;
  ticketName:        string;         // "Entrada", "Ticket", "Inscripción"
  enabledPayments:   string[];       // ["transfer", "mercadoPago", "flowPay"]
  dayTickets:        { date: string; label: string; price: number }[];

  // WhatsApp
  showWhatsappButton:  boolean;
  whatsappUrl:         string;
  whatsappButtonLabel: string;
  whatsappAccess:      "always" | "after_registration" | "on_ticket";

  // Form
  formTitle:       string;
  formSubtitle:    string;
  ctaLabel:        string;
  thankYouTitle:   string;
  thankYouText:    string;
  collectName:     boolean;
  collectEmail:    boolean;
  collectPhone:    boolean;
  collectWhatsapp: boolean;
  requireEmail:    boolean;
  requirePhone:    boolean;
  autoTags:        string[];

  // Video
  showVideo:        boolean;
  videoUrl:         string | null;
  videoOrientation: "horizontal" | "vertical";
  videoTitle:       string;
  videoCaption:     string;

  // Features / benefits
  showFeatures: boolean;
  features:     { title: string; text: string }[];

  // Social proof
  showSocialProof:  boolean;
  socialProofCount: string;
  socialProofText:  string;

  // Custom code
  customHeadHtml: string;
  customBodyHtml: string;
};

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  headline:         "Nombre del evento",
  subheadline:      "Únete a nosotros",
  bodyText:         "",
  heroImage:        null,
  gallery:          [],
  accentColor:      "#CDA78F",
  bgColor:          "#F7F4F1",
  sectionOrder:     ["video", "description", "community", "map", "features", "gallery", "socialProof"],

  eventType:        "IN_PERSON",
  eventDate:        "",
  eventTime:        "19:00",
  eventEndTime:     "21:00",
  eventLocation:    "",
  eventLocationUrl: "",
  eventEndDate:     "",
  eventCapacity:    0,

  ticketMode:       "FREE",
  ticketPrice:      0,
  ticketName:       "Entrada",
  enabledPayments:  ["transfer"],
  dayTickets:       [],

  showWhatsappButton:  false,
  whatsappUrl:         "",
  whatsappButtonLabel: "Unirse al grupo de WhatsApp",
  whatsappAccess:      "on_ticket",

  formTitle:       "Reserva tu lugar",
  formSubtitle:    "Completa tus datos y recibe tu entrada",
  ctaLabel:        "Reservar entrada",
  thankYouTitle:   "¡Registro completado!",
  thankYouText:    "Te esperamos en el evento.",
  collectName:     true,
  collectEmail:    true,
  collectPhone:    true,
  collectWhatsapp: false,
  requireEmail:    true,
  requirePhone:    false,
  autoTags:        [],

  showVideo:        false,
  videoUrl:         null,
  videoOrientation: "horizontal",
  videoTitle:       "",
  videoCaption:     "",

  showFeatures:     false,
  features:         [
    { title: "Qué aprenderás", text: "Descripción del beneficio" },
    { title: "Para quién es", text: "Descripción del público objetivo" },
    { title: "Lo que incluye", text: "Descripción del contenido" },
  ],

  showSocialProof:  false,
  socialProofCount: "50+",
  socialProofText:  "personas registradas",

  customHeadHtml: "",
  customBodyHtml: "",
};

export const DEFAULT_LP_CONFIG: LandingPageConfig = {
  headline:         "Joyas exclusivas para ti",
  subheadline:      "Diseños únicos a tu medida",
  bodyText:         "",
  heroImage:        null,
  accentColor:      "#CDA78F",
  bgColor:          "#F7F4F1",

  formTitle:        "Solicita información",
  formSubtitle:     "Te contactaremos a la brevedad",
  ctaLabel:         "Quiero saber más",
  thankYouTitle:    "¡Gracias por tu interés!",
  thankYouText:     "Te contactaremos pronto.",

  collectName:      true,
  collectEmail:     true,
  collectPhone:     true,
  collectWhatsapp:  false,
  requirePhone:     true,
  requireEmail:     false,
  autoTags:         [],

  showFeatures:     false,
  features:         [
    { title: "Calidad premium", text: "Materiales de la más alta calidad" },
    { title: "Diseño exclusivo", text: "Piezas únicas diseñadas para ti" },
    { title: "Envío seguro",     text: "Empaque especial con seguimiento" },
  ],
  featuresImage:    null,

  showSocialProof:  false,
  socialProofCount: "500+",
  socialProofText:  "clientas satisfechas",

  showProducts:           false,
  productMode:            "MANUAL",
  productIds:             [],
  collectionSlug:         null,
  productCtaLabel:        "Ver en tienda",
  requireLeadBeforeStore: true,

  showForm:               true,

  customHeadHtml:         "",
  customBodyHtml:         "",

  showVideo:              false,
  videoUrl:               null,
  videoOrientation:       "horizontal",
  videoPosition:          "after_hero",
  videoTitle:             "",
  videoCaption:           "",
};
