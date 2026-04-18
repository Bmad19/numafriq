import { useTranslation } from "react-i18next";
import { HeroSlider } from "../components/HeroSlider";
import { Services } from "../components/Services";
import { Process } from "../components/Process";
import { Seo } from "../components/Seo";
import { buildSlides } from "../i18n/buildSlides";

export function ServicesPage() {
  const { t } = useTranslation();
  const slides = buildSlides(t("servicesSlides", { returnObjects: true }) as never, "services");

  return (
    <>
      <Seo title={t("nav.services")} description="NUMAFRIQ — Services digitaux complets pour votre croissance." />
      <HeroSlider slides={slides} />
      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <Services />
        <Process />
      </div>
    </>
  );
}
