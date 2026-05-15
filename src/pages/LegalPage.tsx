import { PageHero } from "../components/PageHero";
import { Seo } from "../components/Seo";
import { LEGAL_PAGE_HERO_IMAGE, LEGAL_PAGE_HERO_IMAGE_POSITION } from "../config/siteImagery";
import { AnimateIn } from "../components/animations/AnimateIn";

type LegalPageProps = {
  title: "Mentions légales" | "Politique de confidentialité";
};

export function LegalPage({ title }: LegalPageProps) {
  const isMentions = title === "Mentions légales";

  return (
    <>
      <Seo title={title} description={`${title} — Afrilex Conseil, cabinet d'assistance juridique, fiscale et comptable.`} />
      <PageHero
        eyebrow="Informations légales"
        title={title}
        description={
          isMentions
            ? "Informations légales concernant Afrilex Conseil et l'éditeur du présent site."
            : "Découvrez comment nous collectons, utilisons et protégeons vos données personnelles."
        }
        image={LEGAL_PAGE_HERO_IMAGE}
        imageObjectPosition={LEGAL_PAGE_HERO_IMAGE_POSITION}
        primaryLabel="Retour à l'accueil"
        primaryTo="/"
      />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <AnimateIn>
          <div className="prose prose-lg prose-invert max-w-none text-mist/90 leading-relaxed">
            {isMentions ? (
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">1. Éditeur du site</h2>
                  <p className="mt-3 leading-relaxed">
                    Le site est édité par <strong>Afrilex Conseil</strong>, cabinet d&apos;assistance juridique, fiscale et comptable, implanté à Ouagadougou (Burkina Faso). Zones d&apos;intervention : Afrique de l&apos;Ouest, autres pays OHADA et diaspora.
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li><strong>Siège :</strong> Ouagadougou, Burkina Faso</li>
                    <li><strong>Email :</strong> <a href="mailto:info@afrilexconseil.com" className="text-lime hover:underline">info@afrilexconseil.com</a></li>
                    <li><strong>Téléphone / WhatsApp :</strong> +226 52 20 91 91</li>
                    <li><strong>Site de référence :</strong> <a href="https://afrilexconseil.com/" className="text-lime hover:underline" target="_blank" rel="noopener noreferrer">afrilexconseil.com</a></li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">2. Hébergement</h2>
                  <p className="mt-3 leading-relaxed">
                    Les informations relatives à l'hébergeur du présent site peuvent être communiquées sur demande à l'adresse <a href="mailto:info@afrilexconseil.com" className="text-lime hover:underline">info@afrilexconseil.com</a>.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">3. Propriété intellectuelle</h2>
                  <p className="mt-3 leading-relaxed">
                    L'ensemble de ce site relève des législations nationales et internationales sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents iconographiques et photographiques.
                  </p>
                  <p className="mt-2 leading-relaxed">
                    La reproduction de tout ou partie de ce site sur un support électronique ou papier quel qu'il soit est formellement interdite sauf autorisation expresse du directeur de la publication.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">4. Responsabilité</h2>
                  <p className="mt-3 leading-relaxed">
                    Afrilex Conseil s'efforce d'assurer au mieux l'exactitude et la mise à jour des informations diffusées sur ce site et se réserve le droit d'en modifier le contenu à tout moment et sans préavis. Les informations présentées le sont à titre général ; une analyse juridique, fiscale ou comptable personnalisée requiert un mandat formel avec le cabinet.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">1. Collecte des données personnelles</h2>
                  <p className="mt-3 leading-relaxed">
                    Lors de votre navigation sur ce site, nous sommes susceptibles de recueillir les données personnelles suivantes, notamment via le formulaire de contact :
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li>Noms et prénoms</li>
                    <li>Adresse email professionnelle</li>
                    <li>Numéro de téléphone</li>
                    <li>Détails relatifs à votre demande juridique, fiscale ou comptable</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">2. Utilisation des données</h2>
                  <p className="mt-3 leading-relaxed">
                    Les données collectées sont utilisées exclusivement pour :
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li>Répondre à vos demandes d'information ou de prise de contact</li>
                    <li>Vous recontacter dans le cadre d'une éventuelle mission</li>
                    <li>Améliorer votre expérience de navigation sur notre site (données analytiques anonymisées)</li>
                  </ul>
                  <p className="mt-2 leading-relaxed">
                    Vos données ne sont en aucun cas revendues ou cédées à des tiers.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">3. Conservation et sécurité</h2>
                  <p className="mt-3 leading-relaxed">
                    Nous mettons en œuvre les mesures appropriées pour protéger vos informations contre tout accès, modification, divulgation ou destruction non autorisés.
                    Les données sont conservées pendant une durée proportionnée aux finalités (souvent jusqu'à trois ans après le dernier contact sauf obligations légales contraires).
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">4. Droits des utilisateurs</h2>
                  <p className="mt-3 leading-relaxed">
                    Conformément aux réglementations applicables, vous disposez notamment de droits d'accès, de rectification, de suppression et d'opposition pour les données vous concernant.
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Pour exercer ces droits :{" "}
                    <a href="mailto:info@afrilexconseil.com" className="ml-1 text-lime hover:underline">info@afrilexconseil.com</a>.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">5. Cookies</h2>
                  <p className="mt-3 leading-relaxed">
                    Ce site peut utiliser des cookies strictement nécessaires au fonctionnement et, le cas échéant, des cookies de mesure d'audience anonyme. Vous pouvez les désactiver via les paramètres de votre navigateur.
                  </p>
                </section>
              </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </>
  );
}
