import { useTranslation } from "react-i18next";
import { HeroSlider } from "../components/HeroSlider";
import { Work } from "../components/Work";
import { Testimonials } from "../components/Testimonials";
import { Seo } from "../components/Seo";
import { buildSlides } from "../i18n/buildSlides";

export function WorkPage() {
  const { t } = useTranslation();
  const slides = buildSlides(t("workSlides", { returnObjects: true }) as never, "work");

  return (
    <>
      <Seo title={t("nav.realisations")} description={t("work.seoDescription")} />
      <HeroSlider slides={slides} />
      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <Work />
        <Testimonials />
      </div>
    </>
  );
}
