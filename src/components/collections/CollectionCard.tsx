import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/lib/mock-data";

export default function CollectionCard({
  collection,
}: {
  collection: Collection;
}) {
  return (
    <Link
      href={`/colecciones/${collection.slug}`}
      className="group block relative overflow-hidden aspect-[3/4] bg-brand-beige-light"
    >
      <Image
        src={collection.image}
        alt={collection.name}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, 25vw"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/50 via-transparent to-transparent" />

      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-5 text-center">
        <h3 className="font-heading text-xl tracking-[0.2em] uppercase text-white mb-1">
          {collection.name}
        </h3>
        <span className="text-[9px] tracking-[0.3em] uppercase text-white/80 group-hover:text-white transition-colors">
          Ver más
        </span>
      </div>
    </Link>
  );
}
