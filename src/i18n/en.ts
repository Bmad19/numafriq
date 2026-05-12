import type { Translations } from "./fr";

const en: Translations = {
  nav: {
    home:          "Home",
    services:      "Services",
    realisations:  "Portfolio",
    blog:          "Blog",
    apropos:       "About",
    contact:       "Contact",
    carrieres:     "Careers",
    cta:           "Start a project",
  },

  footer: {
    tagline:    "Web agency & digital identity. We craft digital experiences that captivate and convert — for African and international brands.",
    navigation: "Navigation",
    contact:    "Contact",
    reponse:    "Response within 24 business hours",
    disponible: "Available for new projects",
    mentions:   "Legal Notice",
    politique:  "Privacy Policy",
    droits:     "All rights reserved.",
    tags: ["Strategy", "Web design", "SEO", "Acquisition"],
  },

  homeSlides: [
    {
      tag: "Digital presence",
      eyebrow: "Website & brand image",
      title: "A website that builds\ntrust and\nconverts.",
      sub: "We design clear, reassuring, results-driven websites that strengthen your credibility and turn visitors into clients.",
      cta: "Build my site",
      ctaSecondary: "Our work",
    },
    {
      tag: "Acquisition & SEO",
      eyebrow: "SEO, content, acquisition",
      title: "Be found by\nthose who need\nyou.",
      sub: "Natural referencing, Ads campaigns and content strategy tailored to your market — in Africa and internationally.",
      cta: "Boost my visibility",
      ctaSecondary: "Our work",
    },
    {
      tag: "UX & Growth",
      eyebrow: "Design & differentiation",
      title: "Stand out\nwith a design\nthat sells.",
      sub: "Positioning, UX and conversion funnel designed to elevate your brand and defend your value against the competition.",
      cta: "Start a project",
      ctaSecondary: "Our work",
    },
  ],

  home: {
    needTitle:  "What do you need?",
    need: [
      {
        title: "Exist on the web",
        text:  "A premium showcase website that builds credibility, reassures prospects and highlights your expertise.",
        cta:   "Build a website",
      },
      {
        title: "Decode legal risks & compliance",
        text:  "Curated posts from Afrilex Conseil: contracts, OHADA governance and practical guidance for leaders.",
        cta:   "Explore the blog",
      },
      {
        title: "Stand out for the long term",
        text:  "Positioning, design and conversion funnel to break through and better defend your value.",
        cta:   "See our work",
      },
    ],
    valuesTag:   "Our values",
    valuesTitle: "A clear, business-driven methodology",
    valuesSub:   "A simple yet rigorous process, designed to deliver visible results.",
    values: [
      {
        title: "Analyse & understand",
        desc:  "We clarify your audience, objectives and pain points before producing anything.",
      },
      {
        title: "Co-build with you",
        desc:  "Every step is validated together: structure, design, content and key decisions.",
      },
      {
        title: "Deliver & evolve",
        desc:  "After launch, we monitor your performance to improve conversions and visibility.",
      },
    ],
    refsTag:   "References",
    refsTitle: "Organisations that trust us with their image and digital growth",
    refsSub:   "We have worked with 130+ companies, from innovative startups to Pan-African institutions.",
    refsLink:  "See all projects",
    ctaTag:    "Ready to start?",
    ctaTitle:  "Your website should help you sell, reassure and grow.",
    ctaSub:    "Let's talk about your goals and build a clear, credible solution tailored to your African or international market.",
    ctaBtn1:   "Launch my project",
    ctaBtn2:   "Visit the blog",
  },

  services: {
    eyebrow:  "What we do",
    title:    "A 360° offer built for Africa and beyond",
    sub:      "From strategy to acquisition, NUMAFRIQ builds complete, readable digital setups adapted to real-world conditions.",
    approach: "Approach",
    approachText: "A simple read of your needs, clear deliverables and execution designed to produce concrete results.",
    cta:      "Ready to scope",
  },

  process: {
    eyebrow: "Our method",
    title:   "How we work",
    sub:     "A clear and collaborative production process, inspired by the best African web agencies and adapted to your objectives.",
    cta:     "Start now",
    steps: [
      { n: "01", title: "Audit & strategy",      desc: "Discovery workshop, market and competitor analysis. We define your business priorities and KPIs together." },
      { n: "02", title: "UX & design prototype", desc: "Sitemap, wireframes and high-fidelity mockups validated step by step for a clear and persuasive experience." },
      { n: "03", title: "Development & SEO",     desc: "Performant, responsive integration, technical SEO, analytics tracking and multi-device testing before launch." },
      { n: "04", title: "Launch & acquisition",  desc: "Controlled launch, Google Business/Ads setup and initial acquisition plan to quickly generate results." },
      { n: "05", title: "Ongoing monitoring",    desc: "Dashboard, maintenance, monthly optimisations and coaching to improve your performance over time." },
    ],
  },

  about: {
    eyebrow: "NUMAFRIQ",
    title:   "An African web agency combining market proximity, visual excellence and business logic",
    p1:      "NUMAFRIQ supports businesses, brands and ambitious organisations that want a more credible, readable and effective digital presence.",
    points: [
      "Strategic framing and transparent roadmap",
      "Clean, readable execution aligned with your business priorities",
      "Polished design, clear experience and measurable performance",
    ],
    distinguish:     "What sets us apart",
    distinguishText: "A deep understanding of local realities, a premium visual language and a structured way of working that avoids vague, slow or disconnected projects.",
    markets:    "Presence & markets served",
    card: {
      method:      "Method",
      methodSub:   "Discovery → wireframes → design → integration → launch. You validate at every key step.",
      slot:        "Next availability",
      slotDate:    "April — June 2026",
      position:    "Positioning",
      positionText:"African web agency focused on impact, clarity and premium execution.",
    },
    stats: [
      { n: "130+", l: "clients supported" },
      { n: "170+", l: "digital projects" },
      { n: "10+",  l: "countries covered" },
    ],
  },

  blog: {
    brand:             "Afrilex Conseil",
    seoDescription:
      "Legal insights, OHADA governance and practical tips from Afrilex Conseil's blog (Ouagadougou, Burkina Faso).",
    heroEyebrow:       "Firm & counsel",
    heroTitle:         "Afrilex Conseil blog",
    heroDescription:
      "Legal analysis, compliance and governance — authored by Afrilex and shown here with reader comments below each article.",
    sourceDisclaimer:
      "Editorial content maintained by Afrilex; updates may be published from the secured bureau workspace.",
    sourceFooter:
      "Afrilex Conseil editorial post. Comments are displayed here after submission.",
    ctaExplore:        "Browse articles",
    readArticle:      "Read on this site",
    loadError:        "We couldn't load articles right now.",
    retry:            "Try again",
    empty:            "No articles are available.",
    backToListing:    "All articles",
    openOriginal:     "Open on afrilexconseil.com",
    notFound:         "Article not found",
    loadingArticle:  "Loading article…",

    comments: {
      title:             "Discussion",
      subtitle:
        "Comments shown on this site. Your email stays private — it helps limit spam.",
      formTitle:         "Leave a comment",
      name:              "Name / display name",
      email:             "Email",
      message:           "Your message",
      hintModeration:
        "Plain text only. Respectful on-topic remarks; spam or abusive content may be removed at host level.",
      submit:            "Post comment",
      sending:           "Sending…",
      success:           "Thanks — your comment is live.",
      error:             "We couldn’t post this comment.",
      rateLimit:         "Too many posts from this connection. Try again in an hour.",
      empty:             "No comments yet. Start the thread below.",
      loadingList:       "Loading comments…",
    },
  },

  pricing: {
    eyebrow: "Pricing",
    title:   "Clear packages for every stage of growth",
    sub:     "Transparent pricing, precise deliverables and tailored support based on your level of digital maturity.",
    sub2:    "Pricing designed to stay competitive in the West African market while maintaining a professional level of execution.",
    badge:   "Most popular",
    plans: [
      {
        name: "Starter", subtitle: "To launch your online presence", price: "From 450,000 FCFA",
        features: ["Professional website (up to 5 pages)", "Responsive design (mobile & desktop)", "Basic technical SEO", "Contact form + WhatsApp", "Onboarding training"],
        cta: "Get a Starter quote",
      },
      {
        name: "Growth", subtitle: "To accelerate leads and sales", price: "From 850,000 FCFA",
        features: ["Everything in Starter", "Optimised conversion funnel", "Google Business & local SEO", "Analytics dashboard", "Priority support for 60 days"],
        cta: "Choose Growth pack",
        featured: true,
      },
      {
        name: "Premium", subtitle: "For a complete digital platform", price: "From 1,800,000 FCFA",
        features: ["Custom site/app or advanced e-commerce", "Business integrations (payment, CRM, API)", "SEO + Ads acquisition", "Monthly tracking & maintenance", "Ongoing strategic support"],
        cta: "Build Premium offer",
      },
    ],
  },

  faq: {
    eyebrow: "FAQ",
    title:   "Frequently asked questions",
    sub:     "Can't find the answer? Write to us directly.",
    items: [
      { q: "How much does a website with NUMAFRIQ cost?",  a: "Projects start from 450,000 FCFA for a showcase website. We provide a detailed quote after a free 30-min discovery call — no commitment required." },
      { q: "How long does delivery take?",                 a: "A landing page is delivered in 2–3 weeks. A full showcase site takes 4–6 weeks. E-commerce and custom apps range from 6 to 16 weeks." },
      { q: "Do you work with clients outside Africa?",     a: "Absolutely. Our clients are in France, Belgium, Canada and Francophone Africa. We work remotely via Notion, Figma and weekly video calls." },
      { q: "Can I manage my website myself after delivery?",a: "Yes, always. We integrate a simple back-office based on your needs. An onboarding session is included in all our packages." },
      { q: "Do you offer Google Business, SEO and ads?",   a: "Yes, NUMAFRIQ provides a full offering: natural SEO, Google Business & Maps optimisation, and Google/Meta Ads campaigns." },
      { q: "Do you offer post-launch maintenance?",        a: "Yes — monthly maintenance packages available: security updates, bug fixes, minor improvements and priority tech support." },
      { q: "How does payment work?",                       a: "We work in 3 instalments: 40% at kickoff, 40% on design validation, 20% at launch. Bank transfer, PayPal or mobile money accepted." },
    ],
  },

  contact: {
    title:    "Your project deserves a real conversation.",
    sub:      "Tell us what you want to build. Our team responds within 24 business hours with a clear first orientation.",
    steps:   ["You", "Project", "Message"],
    items: [
      { icon: "⚡", label: "Response within 24 business hours" },
      { icon: "🔒", label: "No commitment, no jargon" },
      { icon: "🌍", label: "Francophone Africa & diaspora" },
    ],
    socialProof: "+130 projects delivered across Africa",
    step1: { title: "Who are you?", name: "Full name *", company: "Company", email: "Email *", phone: "WhatsApp / Phone", namePlaceholder: "John Doe", companyPlaceholder: "My company", emailPlaceholder: "you@email.com", phonePlaceholder: "+33 6 00 00 00 00" },
    step2: { title: "Your project", servicelabel: "Service needed *", budgetLabel: "Estimated budget", timelineLabel: "Desired timeline" },
    step3: { title: "Your message", label: "Describe your project *", placeholder: "Describe your project, objectives, what already exists and what you concretely expect…" },
    disclaimer: "No commitment, no spam. Just a structured, useful conversation.",
    back: "← Back",
    next: "Continue",
    send: "Send project →",
    sending: "Sending…",
    successTitle: "Message sent!",
    successSub:   "We'll get back to you within 24 hours with a clear direction.",
    newMessage:   "New message",
    errorTitle:   "Send error",
    retry:        "Try again",
  },

  careers: {
    seoDesc:
      "Join NUMAFRIQ: transparent hiring path, product-minded culture, apply online with your CV.",
    introTag: "Responsible employer",
    introTitle: "Build your career with a demanding, supportive digital team",
    introSub:
      "NUMAFRIQ ships web platforms and growth programmes for brands across Africa and internationally. We look for curious, rigorous, impact-driven profiles — engineering, design, SEO, project leadership or legal/editorial content aligned with our Afrilex ecosystem.",
    pillars: [
      {
        title: "Clarity & feedback",
        desc: "Readable recruitment milestones, explicit role criteria and personalised feedback when your profile is shortlisted — or when we cannot move forward.",
      },
      {
        title: "Skill growth",
        desc: "Tech/design watch, structured reviews with seniors and shared rituals so everyone levels up together.",
      },
      {
        title: "Thoughtful hybrid work",
        desc: "Remote-friendly collaboration with structured syncs and documented deliverables — suited to creative, distributed teams.",
      },
    ],
    openRolesTag: "Open roles",
    openRolesTitle: "Roles we are actively hiring for",
    openRolesLead:
      "Published from the Afrilex / NUMAFRIQ back office (“Offres emploi”). Apply from a card or pick a generic role in the form below.",
    openRolesEmpty:
      "No published openings right now. You can still send a spontaneous application via the form.",
    openRolesLoadError:
      "Could not load openings. The form still works — refresh the page or try again later.",
    expandRole: "Read full description",
    collapseRole: "Collapse",
    applyToRole: "Apply for this role",
    journeyTag: "HR journey",
    journeyTitle: "What happens after you apply?",
    journeySub:
      "Standard process aligned with modern HR practice: no discrimination based on origin, gender, age or family status; decisions grounded in skills, experience and cultural fit with our clarity and reliability values.",
    journeySteps: [
      {
        title: "Online application",
        desc: "Complete the form below, attach an up-to-date CV (PDF or Word) and a concise motivation note.",
      },
      {
        title: "HR shortlisting",
        desc: "We assess fit against open roles or our spontaneous pipeline. Incomplete applications may be set aside.",
      },
      {
        title: "Interviews",
        desc: "Conversations with operators: light situational questions, deep dives into tangible outcomes and collaboration styles.",
      },
      {
        title: "Decision & onboarding",
        desc: "Offer or constructive feedback within ~10–15 business days under normal load. If hired: scope clarification, start date and paperwork.",
      },
    ],
    charterTag: "Fairness & privacy",
    charterTitle: "Equal treatment and confidentiality",
    charterItems: [
      "Your data is used solely for recruitment — never sold to third parties.",
      "CVs are stored securely with access limited to authorised HR and hiring managers.",
      "Request updates or deletion anytime via info@numafriq.com.",
      "Spontaneous applications welcome — specify your focus area to speed internal routing.",
    ],
    formTag: "Application form",
    formTitle: "Submit a structured application",
    formSub:
      "Fields marked with an asterisk are required. Prepare an updated CV (max. 5 MB) and a motivation note explaining your contribution to NUMAFRIQ.",
    form: {
      firstName: "First name *",
      lastName: "Last name *",
      email: "Professional email *",
      phone: "Phone / WhatsApp",
      cityCountry: "City & country",
      linkedin: "LinkedIn profile URL",
      position: "Role family you target *",
      contract: "Desired collaboration type *",
      availability: "Availability (notice period, start date…)",
      experience: "Relevant professional experience",
      education: "Highest completed education level",
      languages: "Languages (e.g. Native French, English C1)",
      motivation: "Motivation / professional project *",
      motivationPlaceholder:
        "Outline your path, 2–3 achievements you are proud of, what attracts you to NUMAFRIQ / Afrilex Conseil and your expectations for the next 12 months (minimum ~80 characters).",
      cv: "Curriculum vitæ *",
      cvHint: "PDF, DOC or DOCX — up to 5 MB.",
      removeFile: "Remove file",
      consent:
        "I agree that NUMAFRIQ processes my personal data for recruitment purposes, per the site privacy policy. *",
      submit: "Submit application",
      sending: "Sending securely…",
      successTitle: "Application received",
      successSub:
        "Check your inbox: a confirmation email was just sent. Our team will review your file subject to open needs.",
      resetForm: "Submit another application",
      errorTitle: "Submission failed",
      retry: "Try again",
      optional: "Optional",
      availabilityPlaceholder: "e.g. Immediately / 1-month notice / from 01 Sep 2026",
      privacyNavigate: "Read the privacy policy",
      errors: {
        motivationMin: "Motivation text must be at least 80 characters.",
        cvRequired: "Please attach your CV.",
        cvSize: "File exceeds 5 MB.",
        cvType: "Accepted formats: PDF, DOC, DOCX.",
        consent: "You must accept data processing.",
      },
    },
    positions: {
      developer_fullstack: "Engineering — Full-stack / JS",
      developer_frontend: "Front-end / UI engineering",
      developer_backend: "Back-end / APIs & infra",
      designer_uiux: "UI/UX & design systems",
      seo_content: "SEO, content & editorial performance",
      project_manager: "Digital project lead / product ops",
      marketing_growth: "Digital marketing / growth",
      legal_editorial: "Legal & editorial content (Afrilex ecosystem)",
      internship: "Internship or work-study",
      spontaneous: "Spontaneous application — other digital expertise",
    },
    contracts: {
      cdi: "Permanent contract",
      cdd: "Fixed-term / scoped assignment",
      freelance: "Freelance / consulting",
      internship: "Internship / apprenticeship",
      discuss: "To be discussed",
    },
    experience: {
      "0-1": "0 to 1 year",
      "2-3": "2 to 3 years",
      "4-6": "4 to 6 years",
      "7plus": "7+ years",
    },
    education: {
      bac: "High school diploma / equivalent",
      bac2_3: "Associate / Bachelor years",
      bac4_5: "Bachelor / Master 1 level",
      bac5_plus: "Master 2 / Engineering / PhD",
      professional_track: "Self-taught with demonstrable professional track record",
    },
  },

  testimonials: {
    eyebrow: "They trust us",
    title:   "What our clients say",
    sub:     "Satisfied teams, measurable results.",
    trust:   "Organisations trusting our 360° agency approach",
    stats: [
      { n: "4.9/5", l: "Average rating" },
      { n: "120+",  l: "Projects delivered" },
      { n: "98%",   l: "Satisfied clients" },
      { n: "48h",   l: "Response time" },
    ],
  },

  work: {
    eyebrow: "Selection",
    title:   "Recent projects",
    sub:     "Real projects, concrete results.",
    cta:     "Your brand, the next case study →",
    see:     "View project",
    filters: ["All", "Showcase", "E-commerce", "SEO", "App"],
  },

  servicesSlides: [
    { tag: "What we do", eyebrow: "Web & digital creation", title: "Complete offers\nfor your\nonline presence.", sub: "Website creation, UX/UI, SEO, acquisition and support: NUMAFRIQ brings all the right levers together in one cohesive execution.", cta: "Request a quote", ctaSecondary: "See pricing" },
    { tag: "Web & UX", eyebrow: "Websites & applications", title: "Interfaces\nbuilt to\nconvert.", sub: "Landing pages, showcase sites or e-commerce: every interface is designed to present your offer clearly and trigger action.", cta: "Build my site", ctaSecondary: "Our work" },
    { tag: "SEO & Acquisition", eyebrow: "Visibility & growth", title: "Attract more\nqualified\nclients.", sub: "Natural SEO, Google Ads, Meta Ads and optimised content to generate targeted traffic and concrete commercial opportunities.", cta: "Boost my visibility", ctaSecondary: "See packages" },
  ],
  workSlides: [
    { tag: "Our projects", eyebrow: "Recent projects", title: "Real projects,\nmeasurable\nresults.", sub: "Each project combines design, message clarity and user experience to serve a precise business objective.", cta: "Launch my project", ctaSecondary: "Our services" },
    { tag: "Design & Web", eyebrow: "Sites, apps & e-commerce", title: "Interfaces\nthat reflect\nyour ambition.", sub: "Brand identity, showcase sites, online shops: projects designed to elevate your brand and convince prospects at first glance.", cta: "Discuss my project", ctaSecondary: "Pricing" },
    { tag: "Growth & SEO", eyebrow: "Visibility & performance", title: "Strategies\nthat generate\ndemand.", sub: "SEO, acquisition and content: setups designed to attract a qualified audience and turn traffic into real opportunities.", cta: "Boost my activity", ctaSecondary: "Our services" },
  ],
  pricingSlides: [
    { tag: "Pricing", eyebrow: "Clear packages & precise deliverables", title: "Offers designed\nfor your\nreal budget.", sub: "NUMAFRIQ offers simple, transparent packages calibrated to your level of digital maturity.", cta: "Request a quote", ctaSecondary: "Our services" },
    { tag: "Starter Pack", eyebrow: "To launch your presence", title: "Get started\nwithout breaking\nthe bank.", sub: "A professional, responsive, SEO-optimised website to establish your online credibility and start generating enquiries.", cta: "Choose Starter", ctaSecondary: "Request a quote" },
    { tag: "Premium Pack", eyebrow: "For a complete platform", title: "Invest in\nsustainable\ngrowth.", sub: "Custom site/app, business integrations, advanced SEO and monthly monitoring: a complete setup to dominate your market.", cta: "Build Premium", ctaSecondary: "See our work" },
  ],
  aboutSlides: [
    { tag: "Our story", eyebrow: "African web agency", title: "An agency born\nfor Africa\nand the world.", sub: "NUMAFRIQ supports ambitious brands with a rigorous methodology, a sharp eye and results-oriented execution.", cta: "Contact us", ctaSecondary: "Our work" },
    { tag: "Our method", eyebrow: "Clarity, rigour, performance", title: "We work with\nyou, not just\nfor you.", sub: "Every project is built collaboratively: you validate each step, from strategic framing through to launch.", cta: "Start a project", ctaSecondary: "Our services" },
    { tag: "Our expertise", eyebrow: "10+ countries, 130+ clients", title: "International\nstandards,\nlocal roots.", sub: "From Ouagadougou to Paris, our projects combine visual excellence, understanding of African realities and business logic.", cta: "Learn more", ctaSecondary: "See pricing" },
  ],
  contactSlides: [
    { tag: "Let's talk", eyebrow: "Contact & free quote", title: "Your project\nstarts with\na conversation.", sub: "Share your goals, constraints and budget. We'll get back to you within 24 hours with a clear response and useful framing.", cta: "Send a message", ctaSecondary: "See pricing" },
    { tag: "Response within 24h", eyebrow: "Open for new projects", title: "A team\nlistening and\nresponsive.", sub: "Our slots are open. Whether you have a specific project or a simple question, our team will guide you with clarity.", cta: "Write to us", ctaSecondary: "Our services" },
    { tag: "Collaboration & trust", eyebrow: "130+ projects delivered", title: "Join the\nbrands that\ntrust us.", sub: "NUMAFRIQ supports businesses, NGOs and startups across Francophone Africa and the diaspora. Your turn.", cta: "Start now", ctaSecondary: "Our work" },
  ],
  careersSlides: [
    {
      tag: "Talent & craft",
      eyebrow: "NUMAFRIQ careers",
      title: "Join a team that\nships with rigour\nand clarity.",
      sub: "Web builds, SEO and acquisition for ambitious brands. Transparent HR rituals, steady feedback and environments where delivery quality matters.",
      cta: "See the form",
      ctaSecondary: "Contact us",
    },
    {
      tag: "Clear process",
      eyebrow: "Structured hiring",
      title: "Readable steps\nfrom CV upload\nto final decision.",
      sub: "Online application, shortlisting, operational interviews then offer or personalised feedback — aligned with modern talent management standards.",
      cta: "Apply now",
      ctaSecondary: "About us",
    },
    {
      tag: "Africa & diaspora",
      eyebrow: "Remote & sync",
      title: "Collaborate from\nOuagadougou,\nParis or beyond.",
      sub: "Distributed crew across time zones combining international standards with proximity to Francophone markets.",
      cta: "Send my dossier",
      ctaSecondary: "Blog",
    },
  ],

  legal: {
    eyebrow:  "Legal information",
    backHome: "Back to home",
  },
};

export default en;
