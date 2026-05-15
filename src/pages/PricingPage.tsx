import { useTranslation } from "react-i18next";
import { HeroSlider } from "../components/HeroSlider";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { Seo } from "../components/Seo";
import { buildSlides } from "../i18n/buildSlides";

export function PricingPage() {
  const { t } = useTranslation();
  const slides = buildSlides(t("pricingSlides", { returnObjects: true }) as never, "pricing");

  return (
    <>
      <Seo title={t("pricing.title")} description="Afrilex Conseil — Honoraires et modalités de mission du cabinet." />
      <HeroSlider slides={slides} />
      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <Pricing />
        <FAQ />
      </div>
    </>
  );
}
