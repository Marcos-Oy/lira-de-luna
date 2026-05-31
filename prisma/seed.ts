import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const unsplash = (id: string, w = 800, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=85&auto=format&fit=crop`;

async function main() {
  // ── ROOT admin ──────────────────────────────────────────────
  const email    = process.env.ADMIN_ROOT_EMAIL    ?? "admin@liradeluna.cl";
  const password = process.env.ADMIN_ROOT_PASSWORD ?? "Lira2025!";
  const name     = process.env.ADMIN_ROOT_NAME     ?? "Administrador Root";

  const existingAdmin = await prisma.adminUser.findUnique({ where: { email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({
      data: { email, name, passwordHash, role: "ROOT", permissions: [], isActive: true },
    });
    console.log(`✓ ROOT admin creado: ${email}`);
  } else {
    console.log(`✓ ROOT admin ya existe: ${email}`);
  }

  // ── Collections ─────────────────────────────────────────────
  const collectionsData = [
    { slug: "collares", name: "Collares", description: "Piezas delicadas para llevar cerca de tu corazón.", image: unsplash("1599643478518-a784e5dc4c8f", 600, 700), sortOrder: 1 },
    { slug: "aretes",   name: "Aretes",   description: "Diseños minimalistas que enmarcan tu rostro.",      image: unsplash("1535632066927-ab7c9ab60908", 600, 700), sortOrder: 2 },
    { slug: "anillos",  name: "Anillos",  description: "Pequeños símbolos para recordar quién eres.",       image: unsplash("1605100804763-247f67b3557e", 600, 700), sortOrder: 3 },
    { slug: "pulseras", name: "Pulseras", description: "Detalles que acompañan cada momento.",              image: unsplash("1573408301185-9519f94945c2", 600, 700), sortOrder: 4 },
  ];

  for (const col of collectionsData) {
    await prisma.collection.upsert({
      where: { slug: col.slug },
      update: {},
      create: { ...col, isActive: true },
    });
  }
  console.log("✓ Colecciones sincronizadas");

  // ── Products ────────────────────────────────────────────────
  const collectionMap: Record<string, string> = {};
  const dbCollections = await prisma.collection.findMany({ select: { id: true, slug: true } });
  for (const c of dbCollections) collectionMap[c.slug] = c.id;

  const productsData = [
    { slug: "collar-luna-creciente",   name: "Collar Luna Creciente",   collectionSlug: "collares", price: 28900, isNew: true,  isBestseller: true,  description: "Un delicado dije de luna creciente en baño de oro de 18k. Símbolo de renovación y femineidad. Cadena ajustable de 40–45 cm.", images: [unsplash("1611591437281-460bfbe1220a"), unsplash("1599643478518-a784e5dc4c8f"), unsplash("1617038260897-41a1f14a8ca0")], materials: ["Plata .925", "Baño de oro 18k"] },
    { slug: "aretes-aro-luna",         name: "Aretes Aro Luna",         collectionSlug: "aretes",   price: 19900, isNew: true,  isBestseller: true,  description: "Aretes de aro delgado con pequeño dije de luna. Cierre de presión para mayor comodidad. Baño de oro de 18k.", images: [unsplash("1635767798638-3e25273a8236"), unsplash("1535632066927-ab7c9ab60908")], materials: ["Plata .925", "Baño de oro 18k"] },
    { slug: "anillo-celeste",          name: "Anillo Celeste",          collectionSlug: "anillos",  price: 23900, isNew: true,  isBestseller: false, description: "Anillo minimalista con piedra de luna natural engastada. Acabado en plata pulida. Disponible en tallas 5 al 9.", images: [unsplash("1605100804763-247f67b3557e"), unsplash("1607703703674-df96af81dffa")], materials: ["Plata .925", "Piedra de luna"] },
    { slug: "pulsera-cadena-oro",      name: "Pulsera Cadena Dorada",   collectionSlug: "pulseras", price: 17900, isNew: true,  isBestseller: true,  description: "Pulsera de cadena fina en baño de oro de 18k. Cierre de langosta ajustable. Elegante y atemporal.", images: [unsplash("1573408301185-9519f94945c2")], materials: ["Plata .925", "Baño de oro 18k"] },
    { slug: "collar-estrella-polar",   name: "Collar Estrella Polar",   collectionSlug: "collares", price: 25900, isNew: false, isBestseller: true,  description: "Dije de estrella de cinco puntas con acabado brillante. Cadena tipo venetiana de 42 cm. Baño de oro.", images: [unsplash("1617038260897-41a1f14a8ca0")], materials: ["Plata .925", "Baño de oro 18k"] },
    { slug: "aretes-gota-perla",       name: "Aretes Gota Perla",       collectionSlug: "aretes",   price: 22900, isNew: false, isBestseller: true,  description: "Aretes colgantes con perla cultivada en montura de plata. Elegantes para cualquier ocasión.", images: [unsplash("1602173574767-37ac01994b2a")], materials: ["Plata .925", "Perla cultivada"] },
    { slug: "anillo-luna-llena",       name: "Anillo Luna Llena",       collectionSlug: "anillos",  price: 18900, isNew: false, isBestseller: false, description: "Anillo abierto con esfera de plata pulida en el centro. Ajustable y ligero, perfecto para uso diario.", images: [unsplash("1607703703674-df96af81dffa")], materials: ["Plata .925"] },
    { slug: "pulsera-perlas-finas",    name: "Pulsera Perlas Finas",    collectionSlug: "pulseras", price: 14900, isNew: false, isBestseller: false, description: "Pulsera de perlas cultivadas en hilo de seda con cierre de plata. Delicada y femenina.", images: [unsplash("1573408301185-9519f94945c2")], materials: ["Perla cultivada", "Plata .925"] },
    { slug: "collar-infinito",         name: "Collar Infinito",         collectionSlug: "collares", price: 24900, isNew: false, isBestseller: false, description: "Colgante símbolo infinito con acabado en oro. Representa amor y continuidad. Cadena de 40 cm.", images: [unsplash("1617038260897-41a1f14a8ca0")], materials: ["Plata .925", "Baño de oro 18k"] },
    { slug: "aretes-mini-luna",        name: "Aretes Mini Luna",        collectionSlug: "aretes",   price: 15900, isNew: false, isBestseller: false, description: "Aretes pequeños con media luna minimalista. Ideales para uso diario. Cierre tipo argolla.", images: [unsplash("1535632066927-ab7c9ab60908")], materials: ["Plata .925"] },
    { slug: "anillo-estrella",         name: "Anillo Estrella",         collectionSlug: "anillos",  price: 20900, isNew: false, isBestseller: false, description: "Anillo delgado con estrella engarzada en el centro. Diseño elegante en plata .925.", images: [unsplash("1605100804763-247f67b3557e")], materials: ["Plata .925"] },
    { slug: "pulsera-luna-dorada",     name: "Pulsera Luna Dorada",     collectionSlug: "pulseras", price: 19900, isNew: false, isBestseller: false, description: "Pulsera con dije de luna en baño de oro de 18k. Elegante y ligera, perfecta para cualquier ocasión.", images: [unsplash("1573408301185-9519f94945c2")], materials: ["Plata .925", "Baño de oro 18k"] },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { price: p.price, isNew: p.isNew, isBestseller: p.isBestseller },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.price,
        isNew: p.isNew,
        isBestseller: p.isBestseller,
        images: p.images as unknown as import("@prisma/client").Prisma.InputJsonValue,
        materials: p.materials as unknown as import("@prisma/client").Prisma.InputJsonValue,
        collectionId: collectionMap[p.collectionSlug],
        isActive: true,
      },
    });
  }
  console.log("✓ Productos sincronizados");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
