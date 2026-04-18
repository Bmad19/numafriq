import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

type FormState = "idle" | "loading" | "success" | "error";

// URL de l'API PHP — en développement local, pointe vers l'API de prod
const API_URL = import.meta.env.VITE_API_URL ?? "/api/contact.php";

const servicesOpts = [
  { value: "site-vitrine", icon: "🌐" },
  { value: "ecommerce",    icon: "🛒" },
  { value: "seo",          icon: "📈" },
  { value: "branding",     icon: "🎨" },
  { value: "app",          icon: "⚙️" },
  { value: "autre",        icon: "💬" },
];

const budgetValues  = ["<500k","500k-900k","900k-1.8m","1.8m+"];
const timelineValues = ["urgent","2-4sem","1-2mois","flexible"];

const inputCls =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-mist placeholder:text-mist/30 backdrop-blur-sm transition-all focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30 hover:border-white/20";

const selectCls = inputCls + " appearance-none cursor-pointer";

function Chip({
  label, icon, selected, onClick,
}: { label: string; icon: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
        selected
          ? "border-lime/60 bg-lime/10 text-lime shadow-[0_0_12px_rgba(163,230,53,0.2)]"
          : "border-white/10 bg-white/[0.03] text-mist/60 hover:border-white/25 hover:text-mist"
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

export function Contact() {
  const { t } = useTranslation();
  const [state, setState] = useState<FormState>("idle");
  const [step, setStep] = useState(1);

  const services  = servicesOpts.map((s, i) => ({ ...s, label: ["Site vitrine","E-commerce","SEO / Visibilité","Branding / UI","Application web","Autre besoin"][i] }));
  const budgets   = budgetValues.map((v, i) => ({ value: v, label: ["< 500 000 FCFA","500k – 900k FCFA","900k – 1,8M FCFA","1,8M FCFA et +"][i] }));
  const timelines = timelineValues.map((v, i) => ({ value: v, label: ["Urgent","2 – 4 semaines","1 – 2 mois","Flexible"][i] }));
  const steps     = t("contact.steps", { returnObjects: true }) as string[];
  const items     = t("contact.items", { returnObjects: true }) as Array<{ icon: string; label: string }>;
  const [fields, setFields] = useState({
    name: "", company: "", email: "", phone: "",
    service: "", budget: "", timeline: "", message: "",
  });

  function set(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    set(e.target.name as keyof typeof fields, e.target.value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_name:  fields.name,
          from_email: fields.email,
          phone:      fields.phone    || "Non renseigné",
          company:    fields.company  || "Non renseigné",
          service:    fields.service  || "Non précisé",
          budget:     fields.budget   || "Non précisé",
          timeline:   fields.timeline || "Non précisé",
          message:    fields.message,
        }),
      });
      const data = await res.json();
      setState(data.success ? "success" : "error");
    } catch {
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setStep(1);
    setFields({ name: "", company: "", email: "", phone: "", service: "", budget: "", timeline: "", message: "" });
  }

  const canNext1 = fields.name.trim() && fields.email.trim();
  const canNext2 = !!fields.service;

  return (
    <section id="contact" className="scroll-mt-[96px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-16">

          {/* ── Panneau gauche : infos & social proof ── */}
          <AnimateIn>
            <div className="sticky top-28">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">{t("nav.cta")}</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-mist sm:text-4xl text-balance">
                {t("contact.title")}
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-mist/55">
                {t("contact.sub")}
              </p>

              {/* Steps indicator */}
              <div className="mt-10 flex items-center gap-0 overflow-x-auto pb-1 styled-scrollbar">
                {steps.map((s, i) => (
                  <div key={s} className="flex shrink-0 items-center gap-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all ${
                        step > i + 1
                          ? "border-lime bg-lime text-ink"
                          : step === i + 1
                          ? "border-coral bg-coral/10 text-coral"
                          : "border-white/10 text-mist/25"
                      }`}
                    >
                      {step > i + 1 ? "✓" : i + 1}
                    </div>
                    <span className={`ml-2 hidden sm:inline text-xs font-semibold whitespace-nowrap ${step === i + 1 ? "text-mist" : "text-mist/30"}`}>{s}</span>
                    {i < 2 && <div className={`mx-3 sm:mx-4 h-px w-6 sm:w-8 shrink-0 transition-all ${step > i + 1 ? "bg-lime/40" : "bg-white/10"}`} />}
                  </div>
                ))}
              </div>

              {/* Infos rapides */}
              <div className="mt-10 space-y-3">
                {items.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-sm text-mist/50">
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Social proof */}
              <div className="mt-10 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex -space-x-3 shrink-0">
                  {["1573164713619-24c711fe787e", "1531123897727-8f129e1688ce", "1573164574511-73c773193279"].map((id, i) => (
                    <img key={i} className="h-9 w-9 rounded-full border-2 border-ink object-cover" src={`https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80`} alt="" />
                  ))}
                </div>
                <div className="text-xs text-mist/55">{t("contact.socialProof")}
                </div>
              </div>

              {/* Email direct */}
              <a href="mailto:info@numafriq.com" className="mt-6 group flex items-center gap-3 text-sm text-mist/50 transition hover:text-lime">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-lime/60 group-hover:text-lime">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                info@numafriq.com
              </a>
            </div>
          </AnimateIn>

          {/* ── Formulaire multi-step ── */}
          <AnimateIn delay={0.15} direction="left">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              {/* Progress bar top */}
              <div className="h-1 bg-white/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-coral to-lime rounded-full"
                  animate={{ width: `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>

              <AnimatePresence mode="wait">
                {state === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center gap-5 px-8 py-20 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-lime/15 text-4xl border border-lime/30"
                    >
                      ✓
                    </motion.div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-mist">{t("contact.successTitle")}</h3>
                      <p className="mt-2 max-w-xs text-sm text-mist/55">
                        {t("contact.successSub")}
                      </p>
                    </div>
                    <button onClick={reset} className="mt-2 rounded-full border border-white/15 px-6 py-2 text-xs font-semibold text-mist/50 transition hover:border-white/30 hover:text-mist active:scale-95">
                      {t("contact.newMessage")}
                    </button>
                  </motion.div>
                ) : state === "error" ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center gap-5 px-8 py-20 text-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-coral/15 text-4xl border border-coral/30">
                      ✗
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-mist">{t("contact.errorTitle")}</h3>
                      <p className="mt-2 max-w-xs text-sm text-mist/55">
                        Une erreur s'est produite. Veuillez réessayer ou nous écrire directement à{" "}
                        <a href="mailto:info@numafriq.com" className="text-lime hover:underline">
                          info@numafriq.com
                        </a>
                      </p>
                    </div>
                    <button onClick={() => setState("idle")} className="mt-2 rounded-full border border-coral/30 px-6 py-2 text-xs font-semibold text-coral/70 transition hover:border-coral hover:text-coral active:scale-95">
                      {t("contact.retry")}
                    </button>
                  </motion.div>
                ) : (
                  <form key="form" onSubmit={handleSubmit} noValidate className="flex flex-col">
                    <div className="px-8 pt-8 pb-2">
                      <AnimatePresence mode="wait">
                        {step === 1 && (
                          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-mist/35">1 / 3</p>
                              <h3 className="mt-1 font-display text-xl font-bold text-mist">{t("contact.step1.title")}</h3>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="relative">
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="name">{t("contact.step1.name")}</label>
                                <input id="name" name="name" type="text" required value={fields.name} onChange={handleChange} placeholder={t("contact.step1.namePlaceholder")} className={inputCls} />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="company">{t("contact.step1.company")}</label>
                                <input id="company" name="company" type="text" value={fields.company} onChange={handleChange} placeholder={t("contact.step1.companyPlaceholder")} className={inputCls} />
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="email">{t("contact.step1.email")}</label>
                                <input id="email" name="email" type="email" required value={fields.email} onChange={handleChange} placeholder={t("contact.step1.emailPlaceholder")} className={inputCls} />
                              </div>
                              <div>
                                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="phone">{t("contact.step1.phone")}</label>
                                <input id="phone" name="phone" type="tel" value={fields.phone} onChange={handleChange} placeholder={t("contact.step1.phonePlaceholder")} className={inputCls} />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {step === 2 && (
                          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-mist/35">2 / 3</p>
                              <h3 className="mt-1 font-display text-xl font-bold text-mist">{t("contact.step2.title")}</h3>
                            </div>

                            <div>
                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mist/40">{t("contact.step2.servicelabel")}</p>
                              <div className="flex flex-wrap gap-2">
                                {services.map((s) => (
                                  <Chip key={s.value} label={s.label} icon={s.icon} selected={fields.service === s.value} onClick={() => set("service", s.value)} />
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mist/40">{t("contact.step2.budgetLabel")}</p>
                              <div className="flex flex-wrap gap-2">
                                {budgets.map((b) => (
                                  <Chip key={b.value} label={b.label} icon="" selected={fields.budget === b.value} onClick={() => set("budget", b.value)} />
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mist/40">{t("contact.step2.timelineLabel")}</p>
                              <div className="flex flex-wrap gap-2">
                                {timelines.map((t) => (
                                  <Chip key={t.value} label={t.label} icon="" selected={fields.timeline === t.value} onClick={() => set("timeline", t.value)} />
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {step === 3 && (
                          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-mist/35">3 / 3</p>
                              <h3 className="mt-1 font-display text-xl font-bold text-mist">{t("contact.step3.title")}</h3>
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="message">{t("contact.step3.label")}</label>
                              <textarea
                                id="message" name="message" required rows={6} value={fields.message} onChange={handleChange}
                                placeholder={t("contact.step3.placeholder")}
                                className={`${inputCls} resize-none`}
                              />
                            </div>
                            <p className="text-xs text-mist/30">{t("contact.disclaimer")}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Navigation bas */}
                    <div className="flex items-center justify-between border-t border-white/5 px-8 py-5 mt-6">
                      <button
                        type="button"
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        className={`text-xs font-semibold text-mist/40 transition hover:text-mist ${step === 1 ? "invisible" : ""}`}
                      >
                        {t("contact.back")}
                      </button>

                      {step < 3 ? (
                        <button
                          type="button"
                          onClick={() => setStep((s) => s + 1)}
                          disabled={step === 1 ? !canNext1 : !canNext2}
                          className="inline-flex h-11 items-center gap-2 rounded-full bg-coral px-8 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,107,74,0.3)] transition hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {t("contact.next")}
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={state === "loading" || !fields.message.trim()}
                          className="inline-flex h-11 items-center gap-2 rounded-full bg-coral px-8 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,107,74,0.3)] transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {state === "loading" ? (
                            <>
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              {t("contact.sending")}
                            </>
                          ) : t("contact.send")}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </AnimateIn>

        </div>
      </div>
    </section>
  );
}
