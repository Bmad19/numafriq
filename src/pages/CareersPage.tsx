import { useTranslation } from "react-i18next";
import { HeroSlider } from "../components/HeroSlider";
import { Careers } from "../components/Careers";
import { Seo } from "../components/Seo";
import { buildSlides } from "../i18n/buildSlides";

export function CareersPage() {
  const { t } = useTranslation();
  const slides = buildSlides(t("careersSlides", { returnObjects: true }) as never, "careers");

  return (
    <>
      <Seo title={t("nav.recrutement")} description={t("careers.seoDesc")} />
      <HeroSlider slides={slides} />
      <Careers />
    </>
  );
}
