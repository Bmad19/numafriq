import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Direction générale · holding régionale",
    role: "Structuration juridique",
    text: "Accompagnement rigoureux sur nos montages contractuels et notre conformité OHADA. Des livrables clairs et une équipe disponible dans les temps critiques.",
    gradient: "from-coral to-amber-200",
  },
  {
    name: "Promoteur · projet d'infrastructure",
    role: "Fiscalité & projets",
    text: "Le cabinet nous a aidés à sécuriser notre montage fiscal et nos relations avec les parties prenantes. Transparence sur les honoraires et méthode de travail très structurée.",
    gradient: "from-lime to-mist",
  },
  {
    name: "PME · distribution",
    role: "Contentieux commercial",
    text: "Une approche pragmatique du contentieux qui a permis de préserver notre activité tout en défendant nos intérêts. Communication fluide avec leurs associés.",
    gradient: "from-violet to-stone-200",
  },
];

export function Testimonials() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-lime">Témoignages</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
            La confiance de clients qui exigent rigueur et réactivité
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${t.gradient} opacity-20 blur-2xl`} />
              <p className="text-sm leading-relaxed text-mist/90 relative z-10">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-5 pt-5 border-t border-white/10 relative z-10">
                <p className="text-sm font-bold text-mist">{t.name}</p>
                <p className="text-xs text-mist/64 mt-1">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
