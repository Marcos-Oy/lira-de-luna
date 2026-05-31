import Link from "next/link";
import { collections } from "@/lib/mock-data";
import CollectionCard from "@/components/collections/CollectionCard";

export default function FeaturedCollections() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-[11px] tracking-[0.3em] uppercase text-brand-dark">
            Colecciones destacadas
          </h2>
          <Link
            href="/colecciones"
            className="text-[10px] tracking-[0.2em] uppercase text-brand-taupe hover:text-brand-dark transition-colors underline underline-offset-4"
          >
            Ver todas
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </section>
  );
}
