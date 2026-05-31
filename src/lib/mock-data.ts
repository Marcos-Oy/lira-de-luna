export type ProductVariant = {
  id: string;
  label: string;
  type: string;
  stock: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images: string[];
  collection: string;
  collectionSlug: string;
  badge?: "NUEVO" | "AGOTADO";
  materials: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  stock?: number; // undefined = sin control de stock (asume disponible)
  variants?: ProductVariant[];
  saleEnabled?: boolean;
  saleDiscountPct?: number | null;  // 1-99
  saleStartAt?: string | null;
  saleEndAt?: string | null;
};

export function getActiveSalePrice(product: Product): number | null {
  if (!product.saleEnabled || !product.saleDiscountPct) return null;
  const now = new Date();
  if (product.saleStartAt && new Date(product.saleStartAt) > now) return null;
  if (product.saleEndAt && new Date(product.saleEndAt) < now) return null;
  return Math.round(product.price * (1 - product.saleDiscountPct / 100));
}

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
};

const unsplash = (id: string, w = 800, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=85&auto=format&fit=crop`;

export const collections: Collection[] = [
  {
    id: "col-1",
    slug: "collares",
    name: "Collares",
    description: "Piezas delicadas para llevar cerca de tu corazón.",
    image: unsplash("1599643478518-a784e5dc4c8f", 600, 700),
    productCount: 6,
  },
  {
    id: "col-2",
    slug: "aretes",
    name: "Aretes",
    description: "Diseños minimalistas que enmarcan tu rostro.",
    image: unsplash("1535632066927-ab7c9ab60908", 600, 700),
    productCount: 5,
  },
  {
    id: "col-3",
    slug: "anillos",
    name: "Anillos",
    description: "Pequeños símbolos para recordar quién eres.",
    image: unsplash("1605100804763-247f67b3557e", 600, 700),
    productCount: 4,
  },
  {
    id: "col-4",
    slug: "pulseras",
    name: "Pulseras",
    description: "Detalles que acompañan cada momento.",
    image: unsplash("1602173574767-37ac01994b2a", 600, 700),
    productCount: 4,
  },
];

export const products: Product[] = [
  {
    id: "p-1",
    slug: "collar-luna-creciente",
    name: "Collar Luna Creciente",
    description:
      "Un delicado dije de luna creciente en baño de oro de 18k. Símbolo de renovación y femineidad. Cadena ajustable de 40–45 cm.",
    price: 28900,
    image: unsplash("1611591437281-460bfbe1220a"),
    images: [
      unsplash("1611591437281-460bfbe1220a"),
      unsplash("1599643478518-a784e5dc4c8f"),
      unsplash("1617038260897-41a1f14a8ca0"),
    ],
    collection: "Collares",
    collectionSlug: "collares",
    badge: "NUEVO",
    materials: ["Plata .925", "Baño de oro 18k"],
    isNew: true,
    isBestseller: true,
  },
  {
    id: "p-2",
    slug: "aretes-aro-luna",
    name: "Aretes Aro Luna",
    description:
      "Aretes de aro delgado con pequeño dije de luna. Cierre de presión para mayor comodidad. Baño de oro de 18k.",
    price: 19900,
    image: unsplash("1635767798638-3e25273a8236"),
    images: [
      unsplash("1635767798638-3e25273a8236"),
      unsplash("1535632066927-ab7c9ab60908"),
    ],
    collection: "Aretes",
    collectionSlug: "aretes",
    badge: "NUEVO",
    materials: ["Plata .925", "Baño de oro 18k"],
    isNew: true,
    isBestseller: true,
  },
  {
    id: "p-3",
    slug: "anillo-celeste",
    name: "Anillo Celeste",
    description:
      "Anillo minimalista con piedra de luna natural engastada. Acabado en plata pulida. Disponible en tallas 5 al 9.",
    price: 23900,
    image: unsplash("1605100804763-247f67b3557e"),
    images: [
      unsplash("1605100804763-247f67b3557e"),
      unsplash("1607703703674-df96af81dffa"),
    ],
    collection: "Anillos",
    collectionSlug: "anillos",
    badge: "NUEVO",
    materials: ["Plata .925", "Piedra de luna"],
    isNew: true,
    isBestseller: false,
  },
  {
    id: "p-4",
    slug: "pulsera-cadena-oro",
    name: "Pulsera Cadena Dorada",
    description:
      "Pulsera de cadena fina en baño de oro de 18k. Cierre de langosta ajustable. Elegante y atemporal.",
    price: 17900,
    image: unsplash("1617038260897-41a1f14a8ca0"),
    images: [unsplash("1617038260897-41a1f14a8ca0"), unsplash("1602173574767-37ac01994b2a")],
    collection: "Pulseras",
    collectionSlug: "pulseras",
    badge: "NUEVO",
    materials: ["Plata .925", "Baño de oro 18k"],
    isNew: true,
    isBestseller: true,
  },
  {
    id: "p-5",
    slug: "collar-estrella-polar",
    name: "Collar Estrella Polar",
    description:
      "Dije de estrella de cinco puntas con acabado brillante. Cadena tipo venetiana de 42 cm. Baño de oro.",
    price: 25900,
    image: unsplash("1617038260897-41a1f14a8ca0"),
    images: [unsplash("1617038260897-41a1f14a8ca0")],
    collection: "Collares",
    collectionSlug: "collares",
    materials: ["Plata .925", "Baño de oro 18k"],
    isBestseller: true,
  },
  {
    id: "p-6",
    slug: "aretes-gota-perla",
    name: "Aretes Gota Perla",
    description:
      "Aretes colgantes con perla cultivada en montura de plata. Elegantes para cualquier ocasión.",
    price: 22900,
    image: unsplash("1602173574767-37ac01994b2a"),
    images: [unsplash("1602173574767-37ac01994b2a")],
    collection: "Aretes",
    collectionSlug: "aretes",
    materials: ["Plata .925", "Perla cultivada"],
    isBestseller: true,
  },
  {
    id: "p-7",
    slug: "anillo-luna-llena",
    name: "Anillo Luna Llena",
    description:
      "Anillo abierto con esfera de plata pulida en el centro. Ajustable y ligero, perfecto para uso diario.",
    price: 18900,
    image: unsplash("1607703703674-df96af81dffa"),
    images: [unsplash("1607703703674-df96af81dffa")],
    collection: "Anillos",
    collectionSlug: "anillos",
    materials: ["Plata .925"],
    isBestseller: false,
  },
  {
    id: "p-8",
    slug: "pulsera-charm-luna",
    name: "Pulsera Charm Luna",
    description:
      "Pulsera de cadena delgada con charm de luna en baño de oro. Ligera y femenina.",
    price: 14900,
    image: unsplash("1584302179602-e4c3d3fd629d"),
    images: [unsplash("1584302179602-e4c3d3fd629d"), unsplash("1611591437281-460bfbe1220a")],
    collection: "Pulseras",
    collectionSlug: "pulseras",
    materials: ["Plata .925", "Baño de oro 18k"],
    isBestseller: false,
  },
  {
    id: "p-9",
    slug: "collar-minimalista-barra",
    name: "Collar Barra Minimalista",
    description:
      "Dije de barra horizontal con grabado opcional. Símbolo de claridad e intención. Baño de oro 18k.",
    price: 24900,
    image: unsplash("1584302179602-e4c3d3fd629d"),
    images: [unsplash("1584302179602-e4c3d3fd629d")],
    collection: "Collares",
    collectionSlug: "collares",
    materials: ["Plata .925", "Baño de oro 18k"],
    isBestseller: false,
  },
  {
    id: "p-10",
    slug: "aretes-minimalistas-cuadrado",
    name: "Aretes Cuadrado Minimal",
    description:
      "Aretes de poste con forma cuadrada minimalista. Plata .925 sin revestimiento para conservar su brillo natural.",
    price: 15900,
    image: unsplash("1593998066526-65fcab5021a5"),
    images: [unsplash("1593998066526-65fcab5021a5")],
    collection: "Aretes",
    collectionSlug: "aretes",
    materials: ["Plata .925"],
    isBestseller: false,
  },
  {
    id: "p-11",
    slug: "anillo-constellation",
    name: "Anillo Constelación",
    description:
      "Banda delgada con tres pequeñas estrellas grabadas. Representa tu camino único. Plata .925.",
    price: 20900,
    image: unsplash("1605100804763-247f67b3557e"),
    images: [unsplash("1605100804763-247f67b3557e")],
    collection: "Anillos",
    collectionSlug: "anillos",
    materials: ["Plata .925"],
    isBestseller: true,
  },
  {
    id: "p-12",
    slug: "pulsera-piedra-luna",
    name: "Pulsera Piedra de Luna",
    description:
      "Pulsera de cadena con pequeño charm de piedra de luna natural. Energía suave y femenina.",
    price: 19900,
    image: unsplash("1593998066526-65fcab5021a5"),
    images: [unsplash("1593998066526-65fcab5021a5"), unsplash("1607703703674-df96af81dffa")],
    collection: "Pulseras",
    collectionSlug: "pulseras",
    materials: ["Plata .925", "Piedra de luna"],
    isBestseller: false,
  },
];

export const getProductsByCollection = (slug: string) =>
  products.filter((p) => p.collectionSlug === slug);

export const getBestsellers = () =>
  products.filter((p) => p.isBestseller).slice(0, 4);

export const getNewArrivals = () =>
  products.filter((p) => p.isNew).slice(0, 4);

export const getProductBySlug = (slug: string) =>
  products.find((p) => p.slug === slug);

export const getCollectionBySlug = (slug: string) =>
  collections.find((c) => c.slug === slug);

export const getRelatedProducts = (product: Product, limit = 4) =>
  products
    .filter((p) => p.collectionSlug === product.collectionSlug && p.id !== product.id)
    .slice(0, limit);
