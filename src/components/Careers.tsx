import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";
import { readRuntimeEnv } from "../lib/runtimeEnv";
import { CAREERS_POSITION_KEYS, type CareersPositionKey } from "../config/careersPositions";
import { JOB_OFFERS } from "../config/jobOffers";
import { fetchPublishedJobOffers, type PublicJobOffer } from "../lib/publicJobsApi";

type FormState = "idle" | "loading" | "success" | "error";
type ApplicationMode = "offer" | "profile_pool" | "spontaneous";

const POSITION_KEYS = CAREERS_POSITION_KEYS;

const API_URL = readRuntimeEnv("VITE_CAREERS_API_URL", "/api/careers.php");

const CONTRACT_KEYS = ["cdi", "cdd", "freelance", "internship", "discuss"] as const;
const EXPERIENCE_KEYS = ["0-1", "2-3", "4-6", "7plus"] as const;
const EDUCATION_KEYS = ["bac", "bac2_3", "bac4_5", "bac5_plus", "professional_track"] as const;

const CV_MAX_BYTES = 5 * 1024 * 1024;
const MOT_MIN = 80;

const inputCls =
  "w-full rounded-2xl border border-white/14 bg-white/[0.07] px-5 py-4 text-sm text-mist placeholder:text-mist/57 backdrop-blur-sm transition-all focus:border-lime/55 focus:outline-none focus:ring-1 focus:ring-lime/35 hover:border-white/26";

const selectCls = inputCls + " appearance-none cursor-pointer";

const btnSecondary =
  "inline-flex cursor-pointer items-center justify-center rounded-full border border-white/22 bg-white/[0.06] px-5 py-3 text-xs font-bold uppercase tracking-widest text-mist transition hover:bg-white/10";

function scrollToPostuler() {
  window.requestAnimationFrame(() => {
    document.getElementById("postuler")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function offersGridClass(count: number) {
  if (count === 1) return "mx-auto max-w-4xl";
  if (count === 2) return "lg:grid-cols-2";
  return "lg:grid-cols-3";
}

type RenderableOfferItem = {
  title: string;
  summary: string;
  meta: string;
  sections?: Array<{ title: string; paragraphs?: string[]; bullets?: string[] }>;
};
type RenderableOffer = {
  id: string;
  positionKey: CareersPositionKey;
  isNew: boolean;
  source: "static" | "dynamic";
  item: RenderableOfferItem;
};

function dynamicSections(content: string | null | undefined): RenderableOfferItem["sections"] {
  const text = (content ?? "").trim();
  if (!text) return undefined;
  // Sépare en paragraphes (double saut de ligne ou balise <p>)
  const parts = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return [{ title: "Description", paragraphs: parts }];
}

export function Careers() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const [dynamicOffers, setDynamicOffers] = useState<PublicJobOffer[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    fetchPublishedJobOffers(ac.signal).then(setDynamicOffers).catch(() => setDynamicOffers([]));
    return () => ac.abort();
  }, []);

  const renderableOffers = useMemo<RenderableOffer[]>(() => {
    const staticItems: RenderableOffer[] = JOB_OFFERS.map((o) => {
      const item = t(`careers.jobOffers.items.${o.id}`, { returnObjects: true }) as RenderableOfferItem;
      return { id: o.id, positionKey: o.positionKey, isNew: o.isNew, source: "static", item };
    });
    const dynItems: RenderableOffer[] = dynamicOffers.map((d) => {
      const title   = isEn ? (d.title_en   ?? d.title_fr)   : d.title_fr;
      const summary = isEn ? (d.summary_en ?? d.summary_fr) : d.summary_fr;
      const fallbackMeta = [d.contract_type, d.location].filter(Boolean).join(" · ").toUpperCase();
      const meta    = (isEn ? (d.meta_en ?? d.meta_fr) : d.meta_fr) || fallbackMeta;
      const content = isEn ? (d.content_en ?? d.content_fr) : d.content_fr;
      const positionKey =
        d.position_key && (CAREERS_POSITION_KEYS as readonly string[]).includes(d.position_key)
          ? (d.position_key as CareersPositionKey)
          : "spontaneous";
      return {
        id: `dyn_${d.id}`,
        positionKey,
        isNew: !!d.is_new,
        source: "dynamic",
        item: { title, summary, meta, sections: dynamicSections(content) },
      };
    });
    return [...staticItems, ...dynItems];
  }, [dynamicOffers, isEn, t]);

  const offerById = useMemo(() => {
    const m = new Map<string, RenderableOffer>();
    renderableOffers.forEach((o) => m.set(o.id, o));
    return m;
  }, [renderableOffers]);

  const defaultOfferId = renderableOffers[0]?.id ?? "";

  const [state, setState] = useState<FormState>("idle");
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>("offer");
  const [selectedOfferId, setSelectedOfferId] = useState(defaultOfferId);
  useEffect(() => {
    if (!selectedOfferId && defaultOfferId) setSelectedOfferId(defaultOfferId);
  }, [defaultOfferId, selectedOfferId]);
  /** Fiches d’offres : détail dépliable (aperçu + postuler direct, ou tout lire). */
  const [offerDetailsOpen, setOfferDetailsOpen] = useState<Record<string, boolean>>({});
  const [soughtRoleTitle, setSoughtRoleTitle] = useState("");

  const positionLabels = t("careers.positions", { returnObjects: true }) as Record<string, string>;
  const contractLabels = t("careers.contracts", { returnObjects: true }) as Record<string, string>;
  const experienceLabels = t("careers.experience", { returnObjects: true }) as Record<string, string>;
  const educationLabels = t("careers.education", { returnObjects: true }) as Record<string, string>;

  const [fields, setFields] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city_country: "",
    linkedin_url: "",
    position_applied: (JOB_OFFERS[0]?.positionKey ?? POSITION_KEYS[0]) as (typeof POSITION_KEYS)[number],
    contract_type: CONTRACT_KEYS[0],
    availability: "",
    experience_years: "",
    education_level: "",
    languages: "",
    motivation: "",
    consent_data_processing: false,
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const localeShort = i18n.language?.startsWith("en") ? "en" : "fr";

  useEffect(() => {
    if (applicationMode === "spontaneous") {
      setFields((f) => ({ ...f, position_applied: "spontaneous" }));
      return;
    }
    if (applicationMode === "offer") {
      const entry = offerById.get(selectedOfferId);
      if (entry) {
        setFields((f) => ({ ...f, position_applied: entry.positionKey }));
      }
    }
  }, [applicationMode, selectedOfferId, offerById]);

  const set =
    (key: keyof typeof fields) =>
    (value: string | boolean) => {
      setFields((f) => ({ ...f, [key]: value }));
    };

  const validateLocal = useCallback(() => {
    const err: Record<string, string> = {};
    if (fields.motivation.trim().length < MOT_MIN) {
      err.motivation = t("careers.form.errors.motivationMin");
    }
    if (applicationMode === "profile_pool" && soughtRoleTitle.trim().length < 10) {
      err.soughtRole = t("careers.form.errors.soughtRoleMin");
    }
    if (!cvFile) {
      err.cv = t("careers.form.errors.cvRequired");
    } else {
      const lower = cvFile.name.toLowerCase();
      const okExt = lower.endsWith(".pdf") || lower.endsWith(".doc") || lower.endsWith(".docx");
      if (!okExt) err.cv = t("careers.form.errors.cvType");
      if (cvFile.size > CV_MAX_BYTES) err.cv = t("careers.form.errors.cvSize");
    }
    if (!fields.consent_data_processing) {
      err.consent = t("careers.form.errors.consent");
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  }, [
    applicationMode,
    cvFile,
    fields.consent_data_processing,
    fields.motivation,
    soughtRoleTitle,
    t,
  ]);

  const handleCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setCvFile(f ?? null);
    setFieldErrors((prev) => {
      const n = { ...prev };
      delete n.cv;
      return n;
    });
  };

  const resetAll = () => {
    setState("idle");
    setServerMsg(null);
    setFieldErrors({});
    setCvFile(null);
    setApplicationMode("offer");
    setSelectedOfferId(defaultOfferId);
    setSoughtRoleTitle("");
    setFields({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      city_country: "",
      linkedin_url: "",
      position_applied: (JOB_OFFERS[0]?.positionKey ?? POSITION_KEYS[0]) as (typeof POSITION_KEYS)[number],
      contract_type: CONTRACT_KEYS[0],
      availability: "",
      experience_years: "",
      education_level: "",
      languages: "",
      motivation: "",
      consent_data_processing: false,
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerMsg(null);
    if (!validateLocal()) return;

    setState("loading");
    const fd = new FormData();
    fd.append("first_name", fields.first_name.trim());
    fd.append("last_name", fields.last_name.trim());
    fd.append("email", fields.email.trim());
    fd.append("phone", fields.phone.trim());
    fd.append("city_country", fields.city_country.trim());
    fd.append("linkedin_url", fields.linkedin_url.trim());
    fd.append("position_applied", fields.position_applied);
    fd.append("contract_type", fields.contract_type);
    fd.append("availability", fields.availability.trim());
    fd.append("experience_years", fields.experience_years);
    fd.append("education_level", fields.education_level);
    fd.append("languages", fields.languages.trim());
    fd.append("motivation", fields.motivation.trim());
    fd.append("consent_data_processing", fields.consent_data_processing ? "1" : "0");
    fd.append("locale", localeShort);
    fd.append("website", "");
    fd.append("application_mode", applicationMode);
    fd.append("job_offer_ref", applicationMode === "offer" ? selectedOfferId : "");
    fd.append("sought_role_title", soughtRoleTitle.trim());
    if (cvFile) fd.append("cv", cvFile);

    try {
      const res = await fetch(API_URL, { method: "POST", body: fd });
      const data = (await res.json()) as { success?: boolean; message?: string };
      setServerMsg(data.message ?? null);
      setState(data.success ? "success" : "error");
    } catch {
      setState("error");
      setServerMsg(null);
    }
  }

  const journeySteps = useMemo(
    () => t("careers.journeySteps", { returnObjects: true }) as Array<{ title: string; desc: string }>,
    [t],
  );
  const charterItems = useMemo(() => t("careers.charterItems", { returnObjects: true }) as string[], [t]);
  const pillars = useMemo(
    () => t("careers.pillars", { returnObjects: true }) as Array<{ title: string; desc: string }>,
    [t],
  );

  const modeHelp =
    applicationMode === "offer"
      ? t("careers.applicationModes.offerHelp")
      : applicationMode === "profile_pool"
        ? t("careers.applicationModes.profileHelp")
        : t("careers.applicationModes.spontaneousHelp");

  const positionLocked = applicationMode === "offer" || applicationMode === "spontaneous";

  const btnPrimary =
    "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-coral px-10 text-sm font-bold text-ink shadow-[0_0_34px_rgba(236,200,90,0.42)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";

  const tabBtn = (active: boolean) =>
    `rounded-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-widest transition sm:text-[11px] ${
      active
        ? "bg-coral text-ink shadow-[0_0_24px_rgba(236,200,90,0.35)]"
        : "border border-white/18 bg-white/[0.04] text-mist/75 hover:border-white/28 hover:bg-white/[0.07]"
    }`;

  return (
    <div className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-24">
        <AnimateIn>
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">{t("careers.introTag")}</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-mist sm:text-4xl text-balance">
              {t("careers.introTitle")}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-mist/55">{t("careers.introSub")}</p>
            <p className="mt-4 text-sm leading-relaxed text-mist/58">{t("careers.mandatesLine")}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-white/14 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:border-white/22"
              >
                <h2 className="font-display text-lg font-bold text-mist">{p.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-mist/50">{p.desc}</p>
              </div>
            ))}
          </div>
        </AnimateIn>

        <AnimateIn delay={0.05}>
          <section id="offres-emploi" className="scroll-mt-[120px]" aria-labelledby="offres-heading">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime/85">{t("careers.jobOffers.badge")}</p>
                <h2 id="offres-heading" className="mt-2 font-display text-2xl font-bold text-mist sm:text-3xl">
                  {t("careers.jobOffers.title")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-mist/52">{t("careers.jobOffers.lead")}</p>
                <p className="mt-2 text-xs leading-relaxed text-mist/40">{t("careers.jobOffers.hintActions")}</p>
              </div>
              <button type="button" onClick={scrollToPostuler} className={`${btnSecondary} shrink-0 self-start lg:self-auto`}>
                {t("careers.jobOffers.formJump")}
              </button>
            </div>

            <div className={`mt-10 grid gap-6 ${offersGridClass(renderableOffers.length)}`}>
              {renderableOffers.map((offer) => {
                const item = offer.item;
                const hasSections = Array.isArray(item.sections) && item.sections.length > 0;
                const detailsOpen = offerDetailsOpen[offer.id] ?? false;
                const panelId = `offre-detail-${offer.id}`;

                const goApply = () => {
                  setApplicationMode("offer");
                  setSelectedOfferId(offer.id);
                  scrollToPostuler();
                };

                const toggleDetails = () => {
                  setOfferDetailsOpen((prev) => ({ ...prev, [offer.id]: !detailsOpen }));
                };

                return (
                  <article
                    key={offer.id}
                    className="relative flex flex-col rounded-2xl border border-white/14 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:border-lime/35"
                  >
                    {offer.isNew ? (
                      <span className="absolute right-4 top-4 rounded-full bg-lime/18 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-lime">
                        {t("careers.jobOffers.newBadge")}
                      </span>
                    ) : null}
                    <h3 className="pr-16 font-display text-lg font-bold leading-snug text-mist">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-mist/52">{item.summary}</p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-mist/38">{item.meta}</p>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={goApply}>
                        {t("careers.jobOffers.applyBtn")}
                      </button>
                      {hasSections ? (
                        <button
                          type="button"
                          className={`${btnSecondary} w-full sm:w-auto`}
                          aria-expanded={detailsOpen}
                          aria-controls={panelId}
                          onClick={toggleDetails}
                        >
                          {detailsOpen ? t("careers.jobOffers.collapseDetail") : t("careers.jobOffers.expandDetail")}
                        </button>
                      ) : null}
                    </div>

                    {hasSections && detailsOpen ? (
                      <div
                        id={panelId}
                        className="mt-5 max-h-[min(28rem,62vh)] overflow-y-auto rounded-xl border border-white/12 bg-ink/35 p-4 sm:p-5"
                      >
                        <div className="space-y-5">
                          {item.sections!.map((sec, si) => (
                            <div key={`${offer.id}-sec-${si}`}>
                              <h4 className="font-display text-sm font-bold text-mist">{sec.title}</h4>
                              {sec.paragraphs?.map((para, pi) => (
                                <p
                                  key={`${offer.id}-sec-${si}-p-${pi}`}
                                  className="mt-2 text-sm leading-relaxed text-mist/52"
                                >
                                  {para}
                                </p>
                              ))}
                              {sec.bullets?.length ? (
                                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-mist/52">
                                  {sec.bullets.map((b, bi) => (
                                    <li key={`${offer.id}-sec-${si}-b-${bi}`}>{b}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={`${btnPrimary} mt-6 w-full sm:w-auto`}
                          onClick={goApply}
                        >
                          {t("careers.jobOffers.applyBtn")}
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </AnimateIn>

        <AnimateIn delay={0.08}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime/80">{t("careers.journeyTag")}</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-mist sm:text-3xl">{t("careers.journeyTitle")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-mist/50">{t("careers.journeySub")}</p>
            </div>
            <ol className="relative space-y-6 border-l border-white/14 pl-8">
              {journeySteps.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="absolute -left-[39px] top-1 flex h-7 w-7 items-center justify-center rounded-full border border-lime/40 bg-lime/10 text-[11px] font-black text-lime">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-mist">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist/45">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <div className="rounded-3xl border border-white/14 bg-gradient-to-br from-white/[0.06] to-transparent p-8 sm:p-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-mist/35">{t("careers.charterTag")}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-mist">{t("careers.charterTitle")}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {charterItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-mist/55">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.12}>
          <section id="postuler" className="scroll-mt-[120px]">
            <div className="mb-10 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">{t("careers.formTag")}</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-mist sm:text-3xl">{t("careers.formTitle")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-mist/50">{t("careers.formSub")}</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/14 bg-white/[0.03] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
              <div className="h-1 bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-coral via-violet-500/75 to-lime"
                  initial={{ width: "0%" }}
                  animate={{ width: state === "loading" ? "92%" : "100%" }}
                  transition={{ duration: state === "loading" ? 8 : 0.6, ease: "easeInOut" }}
                />
              </div>

              <AnimatePresence mode="wait">
                {state === "success" ? (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5 px-8 py-20 text-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-lime/35 bg-lime/14 text-4xl">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-mist">{t("careers.form.successTitle")}</h3>
                      <p className="mt-2 max-w-md text-sm text-mist/55">{t("careers.form.successSub")}</p>
                    </div>
                    <button type="button" onClick={resetAll} className={`${btnSecondary} mt-2`}>
                      {t("careers.form.resetForm")}
                    </button>
                  </motion.div>
                ) : state === "error" ? (
                  <motion.div
                    key="err"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-5 px-8 py-20 text-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-coral/35 bg-coral/14 text-4xl">
                      ✗
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-mist">{t("careers.form.errorTitle")}</h3>
                      <p className="mt-2 max-w-md text-sm text-mist/55">
                        {serverMsg ??
                          (localeShort === "en"
                            ? "Please try again or email info@afrilexconseil.com with your CV."
                            : "Réessayez ou envoyez votre CV à info@afrilexconseil.com.")}
                      </p>
                    </div>
                    <button type="button" onClick={() => setState("idle")} className={`${btnPrimary} px-8 py-2 text-xs`}>
                      {t("careers.form.retry")}
                    </button>
                  </motion.div>
                ) : (
                  <form key="form" onSubmit={handleSubmit} className="px-6 py-8 sm:px-10 sm:py-10" noValidate>
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
                      aria-hidden
                    />

                    <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-5">
                      <p id="apply-mode-label" className="text-[11px] font-bold uppercase tracking-[0.18em] text-mist/45">
                        {t("careers.applicationModes.legend")}
                      </p>
                      <div
                        role="tablist"
                        aria-labelledby="apply-mode-label"
                        className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={applicationMode === "offer"}
                          className={tabBtn(applicationMode === "offer")}
                          onClick={() => {
                            setApplicationMode("offer");
                            setFieldErrors((e) => {
                              const n = { ...e };
                              delete n.soughtRole;
                              return n;
                            });
                          }}
                        >
                          {t("careers.applicationModes.offer")}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={applicationMode === "profile_pool"}
                          className={tabBtn(applicationMode === "profile_pool")}
                          onClick={() => setApplicationMode("profile_pool")}
                        >
                          {t("careers.applicationModes.profile")}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={applicationMode === "spontaneous"}
                          className={tabBtn(applicationMode === "spontaneous")}
                          onClick={() => {
                            setApplicationMode("spontaneous");
                            setFieldErrors((e) => {
                              const n = { ...e };
                              delete n.soughtRole;
                              return n;
                            });
                          }}
                        >
                          {t("careers.applicationModes.spontaneous")}
                        </button>
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-mist/48">{modeHelp}</p>

                      {applicationMode === "offer" ? (
                        <div className="mt-6">
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-offer">
                            {t("careers.applicationModes.selectOfferLabel")}
                          </label>
                          <select
                            id="cf-offer"
                            value={selectedOfferId}
                            onChange={(e) => setSelectedOfferId(e.target.value)}
                            className={selectCls}
                          >
                            {renderableOffers.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.item.title}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs text-lime/65">
                            <span className="font-semibold text-lime/85">{t("careers.applicationModes.activeOfferLabel")} : </span>
                            {offerById.get(selectedOfferId)?.item.title ?? "—"}
                          </p>
                        </div>
                      ) : null}

                      {applicationMode === "profile_pool" ? (
                        <div className="mt-6">
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-sought">
                            {t("careers.form.soughtRoleLabel")}
                          </label>
                          <input
                            id="cf-sought"
                            value={soughtRoleTitle}
                            onChange={(e) => {
                              setSoughtRoleTitle(e.target.value);
                              setFieldErrors((p) => {
                                const n = { ...p };
                                delete n.soughtRole;
                                return n;
                              });
                            }}
                            placeholder={t("careers.form.soughtRolePlaceholder")}
                            className={inputCls}
                            autoComplete="off"
                          />
                          <p className="mt-2 text-xs text-mist/38">{t("careers.form.soughtRoleHint")}</p>
                          {fieldErrors.soughtRole ? <p className="mt-1 text-xs text-coral/90">{fieldErrors.soughtRole}</p> : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-fn">
                          {t("careers.form.firstName")}
                        </label>
                        <input
                          id="cf-fn"
                          required
                          value={fields.first_name}
                          onChange={(e) => set("first_name")(e.target.value)}
                          className={inputCls}
                          autoComplete="given-name"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-ln">
                          {t("careers.form.lastName")}
                        </label>
                        <input
                          id="cf-ln"
                          required
                          value={fields.last_name}
                          onChange={(e) => set("last_name")(e.target.value)}
                          className={inputCls}
                          autoComplete="family-name"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-em">
                          {t("careers.form.email")}
                        </label>
                        <input
                          id="cf-em"
                          type="email"
                          required
                          value={fields.email}
                          onChange={(e) => set("email")(e.target.value)}
                          className={inputCls}
                          autoComplete="email"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-ph">
                          {t("careers.form.phone")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <input
                          id="cf-ph"
                          type="tel"
                          value={fields.phone}
                          onChange={(e) => set("phone")(e.target.value)}
                          className={inputCls}
                          autoComplete="tel"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-city">
                          {t("careers.form.cityCountry")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <input
                          id="cf-city"
                          value={fields.city_country}
                          onChange={(e) => set("city_country")(e.target.value)}
                          className={inputCls}
                          autoComplete="address-level2"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-li">
                          {t("careers.form.linkedin")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <input
                          id="cf-li"
                          type="url"
                          placeholder="https://"
                          value={fields.linkedin_url}
                          onChange={(e) => set("linkedin_url")(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-pos">
                          {t("careers.form.position")}
                        </label>
                        <select
                          id="cf-pos"
                          value={fields.position_applied}
                          onChange={(e) => set("position_applied")(e.target.value)}
                          className={`${selectCls} ${positionLocked ? "cursor-not-allowed opacity-75" : ""}`}
                          required
                          disabled={positionLocked}
                          aria-disabled={positionLocked}
                        >
                          {POSITION_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {positionLabels[k]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-con">
                          {t("careers.form.contract")}
                        </label>
                        <select
                          id="cf-con"
                          value={fields.contract_type}
                          onChange={(e) => set("contract_type")(e.target.value)}
                          className={selectCls}
                          required
                        >
                          {CONTRACT_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {contractLabels[k]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-av">
                          {t("careers.form.availability")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <input
                          id="cf-av"
                          value={fields.availability}
                          onChange={(e) => set("availability")(e.target.value)}
                          placeholder={t("careers.form.availabilityPlaceholder")}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-exp">
                          {t("careers.form.experience")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <select
                          id="cf-exp"
                          value={fields.experience_years}
                          onChange={(e) => set("experience_years")(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">—</option>
                          {EXPERIENCE_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {experienceLabels[k]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-edu">
                          {t("careers.form.education")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <select
                          id="cf-edu"
                          value={fields.education_level}
                          onChange={(e) => set("education_level")(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">—</option>
                          {EDUCATION_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {educationLabels[k]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-lang">
                          {t("careers.form.languages")}
                          <span className="ml-1 font-normal normal-case text-mist/25">({t("careers.form.optional")})</span>
                        </label>
                        <input
                          id="cf-lang"
                          value={fields.languages}
                          onChange={(e) => set("languages")(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="mt-8">
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-mot">
                        {t("careers.form.motivation")}
                      </label>
                      <textarea
                        id="cf-mot"
                        required
                        rows={7}
                        value={fields.motivation}
                        onChange={(e) => {
                          set("motivation")(e.target.value);
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.motivation;
                            return n;
                          });
                        }}
                        placeholder={t("careers.form.motivationPlaceholder")}
                        className={`${inputCls} resize-y min-h-[140px]`}
                      />
                      <p className="mt-1 text-xs text-mist/35">
                        {fields.motivation.trim().length}/{MOT_MIN} min.
                        {fieldErrors.motivation ? (
                          <span className="ml-2 text-coral/90">{fieldErrors.motivation}</span>
                        ) : null}
                      </p>
                    </div>

                    <div className="mt-8">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-mist/40" htmlFor="cf-cv">
                        {t("careers.form.cv")}
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className={btnSecondary}>
                          <input id="cf-cv" type="file" accept=".pdf,.doc,.docx,application/pdf" className="sr-only" onChange={handleCvChange} />
                          {cvFile ? cvFile.name : "PDF / DOC / DOCX"}
                        </label>
                        {cvFile ? (
                          <button type="button" onClick={() => setCvFile(null)} className="text-xs font-semibold text-mist/52 hover:text-mist">
                            {t("careers.form.removeFile")}
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-mist/40">{t("careers.form.cvHint")}</p>
                      {fieldErrors.cv ? <p className="mt-1 text-xs text-coral/90">{fieldErrors.cv}</p> : null}
                    </div>

                    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/14 bg-white/[0.04] p-4">
                      <input
                        id="cf-consent"
                        type="checkbox"
                        checked={fields.consent_data_processing}
                        onChange={(e) => {
                          set("consent_data_processing")(e.target.checked);
                          setFieldErrors((p) => {
                            const n = { ...p };
                            delete n.consent;
                            return n;
                          });
                        }}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-white/22 bg-ink text-coral focus:ring-lime/40"
                      />
                      <label htmlFor="cf-consent" className="text-sm leading-relaxed text-mist/62">
                        {t("careers.form.consent")}{" "}
                        <Link to="/confidentialite" className="text-lime underline-offset-2 hover:underline">
                          {t("careers.form.privacyNavigate")}
                        </Link>
                      </label>
                    </div>
                    {fieldErrors.consent ? <p className="mt-2 text-xs text-coral/90">{fieldErrors.consent}</p> : null}

                    <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/8 pt-8">
                      <button type="submit" disabled={state === "loading"} className={btnPrimary}>
                        {state === "loading" ? (
                          <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-ink" />
                            {t("careers.form.sending")}
                          </>
                        ) : (
                          t("careers.form.submit")
                        )}
                      </button>
                      <a href="mailto:info@afrilexconseil.com" className="text-sm text-mist/52 transition hover:text-lime">
                        info@afrilexconseil.com
                      </a>
                    </div>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </section>
        </AnimateIn>
      </div>
    </div>
  );
}
