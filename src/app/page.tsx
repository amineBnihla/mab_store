import { CollectionPanels } from "@/components/home/collection-panels";
import { EditorialSplit } from "@/components/home/editorial-split";
import { FeatureBanner } from "@/components/home/feature-banner";
import { Hero } from "@/components/home/hero";
import { AccessoriesRail, NewArrivals } from "@/components/home/product-sections";
import { Services } from "@/components/home/services";

// Product data comes from the database; refresh the prerendered page at most every minute.
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Hero />
      <CollectionPanels />
      <NewArrivals />
      <EditorialSplit />
      <AccessoriesRail />
      <FeatureBanner />
      <Services />
    </>
  );
}
