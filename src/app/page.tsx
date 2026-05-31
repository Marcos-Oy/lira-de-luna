import { prisma } from "@/lib/db";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroCarousel from "@/components/home/HeroCarousel";
import FeaturesStrip from "@/components/home/FeaturesStrip";
import FeaturedCollections from "@/components/home/FeaturedCollections";
import BestSellers from "@/components/home/BestSellers";
import CommunityAndLocationSection from "@/components/home/CommunityAndLocationSection";
import type { StoreLocation } from "@/types/personalization";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [banners, settings] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        image: true,
        eyebrow: true,
        heading: true,
        body: true,
        ctaLabel: true,
        ctaHref: true,
      },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" }, select: { locations: true } }),
  ]);

  const locations = (settings?.locations ?? []) as unknown as StoreLocation[];
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY ?? null;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <HeroCarousel slides={banners} />
        <FeaturesStrip />
        <FeaturedCollections />
        <BestSellers />
        <CommunityAndLocationSection locations={locations} mapsApiKey={mapsApiKey} />
      </main>
      <Footer />
    </>
  );
}
