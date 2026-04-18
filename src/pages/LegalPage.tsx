import { PageHero } from "../components/PageHero";
import { Seo } from "../components/Seo";
import { AnimateIn } from "../components/animations/AnimateIn";

type LegalPageProps = {
  title: "Mentions légales" | "Politique de confidentialité";
};

export function LegalPage({ title }: LegalPageProps) {
  const isMentions = title === "Mentions légales";

  return (
    <>
      <Seo title={title} description={`Page de ${title.toLowerCase()} de l'agence NUMAFRIQ`} />
      <PageHero
        eyebrow="Informations légales"
        title={title}
        description={
          isMentions
            ? "Retrouvez ici toutes les informations légales concernant l'agence NUMAFRIQ et l'éditeur du site."
            : "Découvrez comment nous collectons, utilisons et protégeons vos données personnelles."
        }
        image="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=1920&q=80"
        primaryLabel="Retour à l'accueil"
        primaryTo="/"
      />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <AnimateIn>
          <div className="prose prose-invert prose-mist max-w-none text-mist/80">
            {isMentions ? (
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">1. Éditeur du site</h2>
                  <p className="mt-3 leading-relaxed">
                    Le site <strong>NUMAFRIQ</strong> est édité par l'agence NUMAFRIQ, agence web et digitale intervenant en Afrique et à l'international.
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li><strong>Siège social :</strong> [Adresse de l'agence, ex: Ouagadougou, Burkina Faso]</li>
                    <li><strong>Email de contact :</strong> <a href="mailto:info@numafriq.com" className="text-lime hover:underline">info@numafriq.com</a></li>
                    <li><strong>Téléphone :</strong> [Numéro de téléphone de l'agence]</li>
                    <li><strong>Directeur de la publication :</strong> [Nom du responsable]</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">2. Hébergement</h2>
                  <p className="mt-3 leading-relaxed">
                    Ce site est hébergé par <strong>[Nom de l'hébergeur]</strong>.
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li><strong>Siège social de l'hébergeur :</strong> [Adresse de l'hébergeur]</li>
                    <li><strong>Site web de l'hébergeur :</strong> [Lien vers l'hébergeur]</li>
                  </ul>
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
                    L'agence NUMAFRIQ s'efforce d'assurer au mieux l'exactitude et la mise à jour des informations diffusées sur ce site, dont elle se réserve le droit de corriger, à tout moment et sans préavis, le contenu. Toutefois, NUMAFRIQ ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur ce site.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-8">
                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">1. Collecte des données personnelles</h2>
                  <p className="mt-3 leading-relaxed">
                    Lors de votre navigation sur le site de <strong>NUMAFRIQ</strong>, nous sommes susceptibles de recueillir les données personnelles suivantes, notamment via nos formulaires de contact :
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li>Noms et prénoms</li>
                    <li>Adresse email professionnelle</li>
                    <li>Numéro de téléphone</li>
                    <li>Informations relatives à votre projet (budget, délais, besoins)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">2. Utilisation des données</h2>
                  <p className="mt-3 leading-relaxed">
                    Les données collectées sont utilisées exclusivement pour :
                  </p>
                  <ul className="mt-4 list-disc pl-5 space-y-2">
                    <li>Répondre à vos demandes de devis ou d'information</li>
                    <li>Vous recontacter dans le cadre d'un projet de collaboration</li>
                    <li>Améliorer votre expérience de navigation sur notre site (données analytiques anonymisées)</li>
                  </ul>
                  <p className="mt-2 leading-relaxed">
                    Vos données ne sont en aucun cas revendues ou cédées à des tiers.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">3. Conservation et Sécurité</h2>
                  <p className="mt-3 leading-relaxed">
                    Nous mettons en œuvre toutes les mesures de sécurité nécessaires pour protéger vos informations personnelles contre tout accès, modification, divulgation ou destruction non autorisés. 
                    Les données sont conservées pendant une durée de 3 ans maximum après le dernier contact.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">4. Droits des utilisateurs</h2>
                  <p className="mt-3 leading-relaxed">
                    Conformément aux réglementations en vigueur (notamment le RGPD si applicable), vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant. 
                  </p>
                  <p className="mt-2 leading-relaxed">
                    Pour exercer ces droits, vous pouvez nous contacter à l'adresse suivante : 
                    <a href="mailto:info@numafriq.com" className="ml-1 text-lime hover:underline">info@numafriq.com</a>.
                  </p>
                </section>
                
                <section>
                  <h2 className="font-display text-2xl font-bold text-mist">5. Cookies</h2>
                  <p className="mt-3 leading-relaxed">
                    Le site NUMAFRIQ peut utiliser des cookies strictement nécessaires au fonctionnement du site et des cookies de mesure d'audience anonyme. Vous avez la possibilité de désactiver ces cookies via les paramètres de votre navigateur web.
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
