import { useTranslation } from "react-i18next";
import { HeroSlider } from "../components/HeroSlider";
import { Contact } from "../components/Contact";
import { Seo } from "../components/Seo";
import { buildSlides } from "../i18n/buildSlides";

export function ContactPage() {
  const { t } = useTranslation();
  const slides = buildSlides(t("contactSlides", { returnObjects: true }) as never, "contact");

  return (
    <>
      <Seo title={t("nav.contact")} description="NUMAFRIQ — Parlons de votre projet digital." />
      <HeroSlider slides={slides} />
      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <Contact />
      </div>
    </>
  );
}
