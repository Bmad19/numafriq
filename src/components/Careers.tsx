import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";
import {
  fetchPublicCareerOffers,
  type PublicCareerOffer,
} from "../lib/careersOffersPublic";

type FormState = "idle" | "loading" | "success" | "error";

/** Même origine que l’API contact/blog (Render / proxy local). */
function careersSubmitUrl(): string {
  const explicit = import.meta.env.VITE_CAREERS_API_URL;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const u = import.meta.env.VITE_API_URL;
  if (typeof u === "string" && /^https?:\/\//i.test(u)) {
    try {
      return new URL("/api/careers.php", new URL(u).origin).href;
    } catch {
      /* ignore */
    }
  }
  return "/api/careers.php";
}

const POSITION_KEYS = [
  "developer_fullstack",
  "developer_frontend",
  "developer_backend",
  "designer_uiux",
  "seo_content",
  "project_manager",
  "marketing_growth",
  "legal_editorial",
  "internship",
  "spontaneous",
] as const;

const CONTRACT_KEYS = ["cdi", "cdd", "freelance", "internship", "discuss"] as const;
const EXPERIENCE_KEYS = ["0-1", "2-3", "4-6", "7plus"] as const;
const EDUCATION_KEYS = ["bac", "bac2_3", "bac4_5", "bac5_plus", "professional_track"] as const;

const CV_MAX_BYTES = 5 * 1024 * 1024;
const MOT_MIN = 80;

const inputCls =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-mist placeholder:text-mist/30 backdrop-blur-sm transition-all focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30 hover:border-white/20";

const selectCls = inputCls + " appearance-none cursor-pointer";

export function Careers() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<FormState>("idle");
  const [serverMsg, setServerMsg] = useState<string | null>(null);

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
    position_applied: POSITION_KEYS[0],
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

  const [publicOffers, setPublicOffers] = useState<PublicCareerOffer[]>([]);
  const [offersLoadError, setOffersLoadError] = useState(false);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  const localeShort = i18n.language?.startsWith("en") ? "en" : "fr";

  useEffect(() => {
    const ac = new AbortController();
    setOffersLoadError(false);
    fetchPublicCareerOffers(ac.signal)
      .then(setPublicOffers)
      .catch(() => {
        setOffersLoadError(true);
        setPublicOffers([]);
      });
    return () => ac.abort();
  }, []);

  const positionOptions = useMemo(() => {
    const en = localeShort === "en";
    const offerKeys = new Set(publicOffers.map((o) => o.position_key));
    const legacyFiltered = POSITION_KEYS.filter(
      (k) => k !== "spontaneous" && !offerKeys.has(k),
    );
    const opts: { value: string; label: string }[] = [];
    for (const o of publicOffers) {
      opts.push({ value: o.position_key, label: en ? o.title_en : o.title_fr });
    }
    for (const k of legacyFiltered) {
      opts.push({ value: k, label: positionLabels[k] });
    }
    const sp = POSITION_KEYS.find((k) => k === "spontaneous");
    if (sp) opts.push({ value: sp, label: positionLabels[sp] });
    return opts;
  }, [publicOffers, localeShort, positionLabels]);

  useEffect(() => {
    if (!positionOptions.length) return;
    setFields((f) => {
      const ok = positionOptions.some((o) => o.value === f.position_applied);
      if (ok) return f;
      return { ...f, position_applied: positionOptions[0].value };
    });
  }, [positionOptions]);

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
  }, [cvFile, fields.consent_data_processing, fields.motivation, t]);

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
    setFields({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      city_country: "",
      linkedin_url: "",
      position_applied: POSITION_KEYS[0],
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
    if (cvFile) fd.append("cv", cvFile);

    try {
      const res = await fetch(careersSubmitUrl(), { method: "POST", body: fd });
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
    [t]
  );
  const charterItems = useMemo(() => t("careers.charterItems", { returnObjects: true }) as string[], [t]);
  const pillars = useMemo(() => t("careers.pillars", { returnObjects: true }) as Array<{ title: string; desc: string }>, [t]);

  return (
    <div className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-24">
        {/* ── Introduction ── */}
        <AnimateIn>
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">{t("careers.introTag")}</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-mist sm:text-4xl text-balance">
              {t("careers.introTitle")}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-mist/55">{t("careers.introSub")}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition hover:border-white/15"
              >
                <h2 className="font-display text-lg font-bold text-mist">{p.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-mist/50">{p.desc}</p>
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* ── Postes publiés (bureau) ── */}
        <AnimateIn delay={0.04}>
          <div className="max-w-5xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">
              {t("careers.openRolesTag")}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("careers.openRolesTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist/50">
              {t("careers.openRolesLead")}
            </p>
            {offersLoadError ? (
              <p className="mt-6 text-sm text-coral/90">{t("careers.openRolesLoadError")}</p>
            ) : publicOffers.length === 0 ? (
              <p className="mt-6 text-sm text-mist/40">{t("careers.openRolesEmpty")}</p>
            ) : (
              <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {publicOffers.map((o) => {
                  const title = localeShort === "en" ? o.title_en : o.title_fr;
                  const meta = localeShort === "en" ? o.meta_en : o.meta_fr;
                  const summary = localeShort === "en" ? o.summary_en : o.summary_fr;
                  const detail = localeShort === "en" ? o.detail_en : o.detail_fr;
                  const open = expandedOfferId === o.id;
                  return (
                    <li
                      key={o.id}
                      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-sm transition hover:border-white/15"
                    >
                      <h3 className="font-display text-lg font-bold leading-snug text-mist">{title}</h3>
                      {meta ? (
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-lime/85">{meta}</p>
                      ) : null}
                      {summary ? (
                        <p className="mt-3 text-sm leading-relaxed text-mist/50">{summary}</p>
                      ) : null}
                      {detail && detail.replace(/<[^>]+>/g, "").trim() ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpandedOfferId(open ? null : o.id)}
                            className="mt-4 text-left text-xs font-bold uppercase tracking-widest text-coral hover:text-coral/80"
                          >
                            {open ? t("careers.collapseRole") : t("careers.expandRole")}
                          </button>
                          <AnimatePresence initial={false}>
                            {open ? (
                              <motion.div
                                key="d"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="career-offer-detail mt-3 max-w-none text-sm leading-relaxed text-mist/65 [&_a]:text-lime [&_a]:underline-offset-2 [&_h2]:mt-3 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-mist [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                                  dangerouslySetInnerHTML={{ __html: detail }}
                                />
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </>
                      ) : null}
                      <div className="mt-auto pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            setFields((f) => ({ ...f, position_applied: o.position_key }));
                            document
                              .getElementById("postuler")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="btn-afrilex-secondary w-full px-4 py-3 text-xs font-bold uppercase tracking-widest"
                        >
                          {t("careers.applyToRole")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AnimateIn>

        {/* ── Parcours ── */}
        <AnimateIn delay={0.08}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime/80">{t("careers.journeyTag")}</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-mist sm:text-3xl">{t("careers.journeyTitle")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-mist/50">{t("careers.journeySub")}</p>
            </div>
            <ol className="relative space-y-6 border-l border-white/10 pl-8">
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

        {/* ── Charte données ── */}
        <AnimateIn delay={0.1}>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 sm:p-10">
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

        {/* ── Formulaire ── */}
        <AnimateIn delay={0.12}>
          <section id="postuler" className="scroll-mt-[120px]">
            <div className="mb-10 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral">{t("careers.formTag")}</p>
              <h2 className="mt-3 font-display text-2xl font-bold text-mist sm:text-3xl">{t("careers.formTitle")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-mist/50">{t("careers.formSub")}</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
              <div className="h-1 bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-coral via-violet-500/80 to-lime"
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
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-lime/30 bg-lime/15 text-4xl">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-mist">{t("careers.form.successTitle")}</h3>
                      <p className="mt-2 max-w-md text-sm text-mist/55">{t("careers.form.successSub")}</p>
                    </div>
                    <button type="button" onClick={resetAll} className="btn-afrilex-secondary mt-2 px-6 py-2 text-xs">
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
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-coral/30 bg-coral/15 text-4xl">
                      ✗
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-mist">{t("careers.form.errorTitle")}</h3>
                      <p className="mt-2 max-w-md text-sm text-mist/55">
                        {serverMsg ??
                          (localeShort === "en"
                            ? "Please try again or email info@numafriq.com with your CV."
                            : "Réessayez ou envoyez votre CV à info@numafriq.com.")}
                      </p>
                    </div>
                    <button type="button" onClick={() => setState("idle")} className="btn-afrilex-primary px-6 py-2 text-xs">
                      {t("careers.form.retry")}
                    </button>
                  </motion.div>
                ) : (
                  <form key="form" onSubmit={handleSubmit} className="px-6 py-8 sm:px-10 sm:py-10" noValidate>
                    {/* honeypot */}
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
                      aria-hidden
                    />

                    <div className="grid gap-6 lg:grid-cols-2">
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
                          className={selectCls}
                          required
                        >
                          {positionOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
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
                      <p className="mt-1 text-xs text-mist/30">
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
                        <label className="btn-afrilex-secondary inline-flex cursor-pointer items-center justify-center px-5 py-3 text-xs font-bold uppercase tracking-widest transition hover:bg-white/10">
                          <input id="cf-cv" type="file" accept=".pdf,.doc,.docx,application/pdf" className="sr-only" onChange={handleCvChange} />
                          {cvFile ? cvFile.name : "PDF / DOC / DOCX"}
                        </label>
                        {cvFile ? (
                          <button type="button" onClick={() => setCvFile(null)} className="text-xs font-semibold text-mist/45 hover:text-mist">
                            {t("careers.form.removeFile")}
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-mist/35">{t("careers.form.cvHint")}</p>
                      {fieldErrors.cv ? <p className="mt-1 text-xs text-coral/90">{fieldErrors.cv}</p> : null}
                    </div>

                    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
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
                        className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-ink text-coral focus:ring-lime/40"
                      />
                      <label htmlFor="cf-consent" className="text-sm leading-relaxed text-mist/60">
                        {t("careers.form.consent")}{" "}
                        <Link to="/confidentialite" className="text-lime underline-offset-2 hover:underline">
                          {t("careers.form.privacyNavigate")}
                        </Link>
                      </label>
                    </div>
                    {fieldErrors.consent ? <p className="mt-2 text-xs text-coral/90">{fieldErrors.consent}</p> : null}

                    <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/5 pt-8">
                      <button
                        type="submit"
                        disabled={state === "loading"}
                        className="btn-afrilex-primary h-12 px-10 text-sm font-bold shadow-[0_0_20px_rgba(255,107,74,0.25)] disabled:cursor-not-allowed"
                      >
                        {state === "loading" ? (
                          <>
                            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                            {t("careers.form.sending")}
                          </>
                        ) : (
                          t("careers.form.submit")
                        )}
                      </button>
                      <a href="mailto:info@numafriq.com" className="text-sm text-mist/45 transition hover:text-lime">
                        info@numafriq.com
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
