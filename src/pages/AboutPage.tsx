import { useTranslation } from "react-i18next";
import { HeroSlider } from "../components/HeroSlider";
import { About } from "../components/About";
import { Seo } from "../components/Seo";
import { buildSlides } from "../i18n/buildSlides";

export function AboutPage() {
  const { t } = useTranslation();
  const slides = buildSlides(t("aboutSlides", { returnObjects: true }) as never, "about");

  return (
    <>
      <Seo title={t("nav.apropos")} description="Afrilex Conseil — Organisation institutionnelle, mission et valeurs du cabinet." />
      <HeroSlider slides={slides} />
      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <About />
      </div>
    </>
  );
}
