import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, hasRole } from "../BureauContext";
import {
  mailboxApi,
  type MailboxAccount,
  type MailboxAccountInput,
  type MailboxInbox,
  type MailboxMessageDetail,
  type MailboxMessageSummary,
} from "../api";

const inp = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-coral/50 focus:outline-none transition";
const lbl = "block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5";

const EMPTY_FORM: MailboxAccountInput = {
  label: "",
  email: "",
  password: "",
  imap_host: "",
  imap_port: 993,
  imap_secure: true,
  smtp_host: "",
  smtp_port: 465,
  smtp_secure: true,
  active: true,
};

type ComposeState = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  text: string;
  in_reply_to?: string;
};
const EMPTY_COMPOSE: ComposeState = { to: "", cc: "", bcc: "", subject: "", text: "" };

function inferLwsHost(email: string) {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain ? `mail.${domain}` : "mail.lws-hosting.com";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtSize(b?: number) {
  if (!b || b < 1024) return `${b ?? 0} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
}

function quoteOriginal(msg: MailboxMessageDetail): string {
  const date = msg.date ? new Date(msg.date).toLocaleString("fr-FR") : "(date inconnue)";
  const from = msg.from_name ? `${msg.from_name} <${msg.from_address}>` : msg.from_address;
  const body = msg.text || msg.html.replace(/<[^>]+>/g, "").trim() || "(corps vide)";
  return `\n\nLe ${date}, ${from} a écrit :\n` + body.split("\n").map((l) => `> ${l}`).join("\n");
}

export function MailboxPage() {
  const { user } = useAuth();
  const isSuperAdmin = hasRole(user, "super_admin");

  const [accounts, setAccounts] = useState<MailboxAccount[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inbox, setInbox] = useState<MailboxInbox | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [openMessage, setOpenMessage] = useState<MailboxMessageDetail | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const [accountModal, setAccountModal] = useState<"create" | "edit" | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [form, setForm] = useState<MailboxAccountInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState<ComposeState>(EMPTY_COMPOSE);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function loadAccounts() {
    setLoadingAccounts(true);
    mailboxApi.accounts()
      .then((r) => {
        setAccounts(r.accounts);
        if (r.accounts.length > 0 && activeId == null) setActiveId(r.accounts[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }

  function loadInbox(accountId: number) {
    setLoadingInbox(true);
    setInboxError(null);
    setInbox(null);
    setSelectedUid(null);
    setOpenMessage(null);
    mailboxApi.inbox(accountId, { limit: 100 })
      .then((data) => setInbox(data))
      .catch((e: unknown) => setInboxError(e instanceof Error ? e.message : "Erreur boîte mail"))
      .finally(() => setLoadingInbox(false));
  }

  function loadMessage(accountId: number, uid: number) {
    setLoadingMessage(true);
    setMessageError(null);
    setOpenMessage(null);
    mailboxApi.message(accountId, uid)
      .then((data) => setOpenMessage(data))
      .catch((e: unknown) => setMessageError(e instanceof Error ? e.message : "Lecture impossible"))
      .finally(() => setLoadingMessage(false));
  }

  useEffect(() => { loadAccounts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { if (activeId != null) loadInbox(activeId); }, [activeId]);
  useEffect(() => {
    if (activeId != null && selectedUid != null) loadMessage(activeId, selectedUid);
  }, [activeId, selectedUid]);

  const filteredMessages = useMemo<MailboxMessageSummary[]>(() => {
    if (!inbox) return [];
    const q = search.trim().toLowerCase();
    if (!q) return inbox.messages;
    return inbox.messages.filter((m) =>
      [m.subject, m.from_name, m.from_address, m.to].some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [inbox, search]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingAccountId(null);
    setAccountModal("create");
  }
  function openEdit(a: MailboxAccount) {
    setForm({
      label: a.label,
      email: a.email,
      password: "",
      imap_host: a.imap_host,
      imap_port: a.imap_port,
      imap_secure: a.imap_secure,
      smtp_host: a.smtp_host ?? "",
      smtp_port: a.smtp_port ?? 465,
      smtp_secure: a.smtp_secure ?? true,
      active: a.active,
    });
    setEditingAccountId(a.id);
    setAccountModal("edit");
  }

  function autofillFromEmail(email: string) {
    const host = inferLwsHost(email);
    setForm((f) => ({
      ...f,
      email,
      imap_host: f.imap_host || host,
      smtp_host: f.smtp_host || host,
    }));
  }

  async function saveAccount() {
    if (!form.label?.trim() || !form.email?.trim()) {
      alert("Label et email obligatoires.");
      return;
    }
    if (accountModal === "create" && !form.password) {
      alert("Mot de passe IMAP obligatoire à la création.");
      return;
    }
    setSaving(true);
    try {
      if (accountModal === "create") await mailboxApi.addAccount(form);
      else if (editingAccountId) await mailboxApi.updateAccount(editingAccountId, form);
      setAccountModal(null);
      loadAccounts();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!editingAccountId) {
      alert("Enregistrez d'abord le compte avant de tester.");
      return;
    }
    setTesting(true);
    try {
      const r = await mailboxApi.testConnection(editingAccountId);
      if (r.success) {
        alert(`✅ Connexion IMAP OK — ${r.messages ?? 0} message(s), ${r.unseen ?? 0} non lu(s).`);
      } else {
        alert(`❌ Échec : ${r.error ?? "raison inconnue"}`);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setTesting(false);
    }
  }

  async function removeAccount(a: MailboxAccount) {
    if (!confirm(`Supprimer le compte « ${a.label} » (${a.email}) ?\nCela ne supprime pas les emails LWS, juste l'accès depuis le bureau.`)) return;
    try {
      await mailboxApi.deleteAccount(a.id);
      if (activeId === a.id) setActiveId(null);
      loadAccounts();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openComposeNew() {
    if (accounts.length === 0) {
      alert("Configurez d'abord un compte mail.");
      return;
    }
    setCompose(EMPTY_COMPOSE);
    setSendResult(null);
    setComposeOpen(true);
  }

  function openReply(m: MailboxMessageDetail, mode: "reply" | "reply_all" | "forward") {
    const account = accounts.find((a) => a.id === activeId);
    const myEmail = account?.email.toLowerCase() ?? "";
    const senderAddress = m.from_address;

    if (mode === "forward") {
      setCompose({
        to: "",
        cc: "",
        bcc: "",
        subject: `Tr : ${m.subject.replace(/^(Tr|Fwd?|TR)\s*:\s*/i, "")}`,
        text: `\n\n---------- Message transféré ----------\n${quoteOriginal(m).trim()}`,
      });
    } else {
      const toList = [senderAddress];
      const ccList: string[] = [];
      if (mode === "reply_all") {
        for (const addr of [...(m.to_addresses ?? []), ...(m.cc_addresses ?? [])]) {
          if (!addr) continue;
          const low = addr.toLowerCase();
          if (low === myEmail) continue;
          if (toList.includes(addr) || ccList.includes(addr)) continue;
          ccList.push(addr);
        }
      }
      setCompose({
        to: toList.join(", "),
        cc: ccList.join(", "),
        bcc: "",
        subject: `Re : ${m.subject.replace(/^(Re|RE)\s*:\s*/i, "")}`,
        text: quoteOriginal(m),
        in_reply_to: m.message_id || undefined,
      });
    }
    setSendResult(null);
    setComposeOpen(true);
  }

  async function sendCompose() {
    if (activeId == null) return;
    if (!compose.to.trim()) {
      setSendResult({ kind: "err", text: "Au moins un destinataire (À) est requis." });
      return;
    }
    if (!compose.subject.trim() && !confirm("Envoyer sans objet ?")) return;
    if (!compose.text.trim()) {
      setSendResult({ kind: "err", text: "Le corps du message est vide." });
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const r = await mailboxApi.send(activeId, {
        to: compose.to,
        cc: compose.cc,
        bcc: compose.bcc,
        subject: compose.subject,
        text: compose.text,
        in_reply_to: compose.in_reply_to,
      });
      if (r.success) {
        setSendResult({ kind: "ok", text: `Envoyé à ${r.accepted?.join(", ") ?? compose.to}` });
        setTimeout(() => setComposeOpen(false), 1200);
      } else {
        setSendResult({ kind: "err", text: "Échec d'envoi (réponse non OK)" });
      }
    } catch (e: unknown) {
      setSendResult({ kind: "err", text: e instanceof Error ? e.message : "Échec d'envoi" });
    } finally {
      setSending(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-coral/20 bg-coral/5 p-6">
        <p className="text-sm text-coral">Accès réservé au super administrateur.</p>
      </div>
    );
  }

  const activeAccount = accounts.find((a) => a.id === activeId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Boîte mail LWS</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Consultez et envoyez les emails depuis tous les comptes professionnels créés sur LWS. Mots de passe chiffrés AES-256-GCM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <button onClick={openComposeNew}
              className="rounded-xl bg-violet px-5 py-2.5 text-sm font-bold text-ink hover:brightness-110 transition active:scale-95">
              ✏️ Composer
            </button>
          )}
          <button onClick={openCreate}
            className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">
            + Compte mail
          </button>
        </div>
      </div>

      {loadingAccounts ? (
        <div className="py-16 text-center text-white/48 text-sm">Chargement…</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-2xl">📭</div>
          <p className="text-sm text-white/55">Aucun compte mail configuré.</p>
          <p className="text-xs text-white/40 mt-2 max-w-md mx-auto">
            Cliquez « + Compte mail » et renseignez l'email LWS + mot de passe IMAP. Hôte par défaut : <code className="text-white/65">mail.&lt;votre-domaine&gt;</code>.
          </p>
        </div>
      ) : (
        <>
          {/* Onglets comptes */}
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-1 rounded-full border transition ${
                  a.id === activeId
                    ? "border-coral/35 bg-coral/15"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <button
                  onClick={() => setActiveId(a.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition ${
                    a.id === activeId ? "text-coral" : "text-white/65 hover:text-white"
                  }`}
                >
                  <span>{a.label}</span>
                  <span className="text-[10px] font-normal opacity-65">{a.email}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                  className="px-2 py-2 text-white/55 hover:text-white transition"
                  title="Modifier le compte"
                  aria-label={`Modifier ${a.label}`}
                >⚙</button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeAccount(a); }}
                  className="pr-3 py-2 text-coral/65 hover:text-coral transition"
                  title="Supprimer le compte"
                  aria-label={`Supprimer ${a.label}`}
                >🗑</button>
              </div>
            ))}
          </div>

          {/* Boîte */}
          <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col max-h-[70vh]">
              <div className="border-b border-white/[0.06] p-3 flex items-center gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrer (sujet, expéditeur…)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-coral/40 focus:outline-none"
                />
                <button
                  onClick={() => activeId != null && loadInbox(activeId)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/65 hover:bg-white/[0.08] hover:text-white transition"
                  title="Actualiser"
                >↻</button>
              </div>

              <div className="flex-1 overflow-y-auto styled-scrollbar">
                {loadingInbox ? (
                  <div className="py-16 text-center text-white/48 text-xs">Connexion IMAP…</div>
                ) : inboxError ? (
                  <div className="p-4 text-xs text-coral">{inboxError}</div>
                ) : filteredMessages.length === 0 ? (
                  <div className="py-16 text-center text-white/48 text-xs">
                    {inbox && inbox.messages.length === 0 ? "Boîte vide." : "Aucun résultat."}
                  </div>
                ) : (
                  <ul className="divide-y divide-white/[0.04]">
                    {filteredMessages.map((m) => (
                      <li key={m.uid}>
                        <button
                          onClick={() => setSelectedUid(m.uid)}
                          className={`w-full text-left px-4 py-3 transition hover:bg-white/[0.03] ${
                            m.uid === selectedUid ? "bg-coral/[0.07]" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${m.seen ? "bg-white/20" : "bg-coral"}`} aria-hidden />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`truncate text-sm ${m.seen ? "text-white/75" : "text-white font-semibold"}`}>
                                  {m.from_name || m.from_address || "?"}
                                </p>
                                <span className="text-[10px] text-white/40 whitespace-nowrap">{fmtDate(m.date)}</span>
                              </div>
                              <p className={`mt-0.5 truncate text-xs ${m.seen ? "text-white/55" : "text-white/85 font-medium"}`}>
                                {m.subject}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-white/35">
                                {m.from_address} • {fmtSize(m.size)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {inbox && (
                <div className="border-t border-white/[0.06] px-4 py-2 text-[10px] text-white/45 flex items-center justify-between">
                  <span>{inbox.folder} · {inbox.total} message(s) · {inbox.unseen} non lu(s)</span>
                  <span>{filteredMessages.length} affiché(s)</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col max-h-[70vh]">
              {selectedUid == null ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-2xl">✉️</div>
                  <p className="text-sm text-white/55">Sélectionnez un message à gauche pour le lire,</p>
                  <p className="text-sm text-white/55">ou cliquez « Composer » pour écrire un nouveau message.</p>
                </div>
              ) : loadingMessage ? (
                <div className="flex-1 flex items-center justify-center text-xs text-white/45">Chargement…</div>
              ) : messageError ? (
                <div className="flex-1 p-6 text-sm text-coral">{messageError}</div>
              ) : openMessage ? (
                <>
                  <div className="border-b border-white/[0.06] p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <h2 className="font-display text-lg font-bold text-white leading-tight">{openMessage.subject}</h2>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openReply(openMessage, "reply")}
                          className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral/20 transition"
                          title="Répondre"
                        >↩ Répondre</button>
                        <button
                          onClick={() => openReply(openMessage, "reply_all")}
                          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/[0.07] transition"
                          title="Répondre à tous"
                        >↩↩ Tous</button>
                        <button
                          onClick={() => openReply(openMessage, "forward")}
                          className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/75 hover:bg-white/[0.07] transition"
                          title="Transférer"
                        >→ Tr</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-y-1.5 gap-x-3 text-xs">
                      <span className="text-white/40 uppercase tracking-wider">De</span>
                      <span className="text-white/85">
                        <span className="font-semibold">{openMessage.from_name || openMessage.from_address}</span>
                        {openMessage.from_address && openMessage.from_name ? <span className="text-white/45"> &lt;{openMessage.from_address}&gt;</span> : null}
                      </span>
                      <span className="text-white/40 uppercase tracking-wider">À</span>
                      <span className="text-white/65">{openMessage.to || "—"}</span>
                      {openMessage.cc ? (<>
                        <span className="text-white/40 uppercase tracking-wider">Cc</span>
                        <span className="text-white/65">{openMessage.cc}</span>
                      </>) : null}
                      <span className="text-white/40 uppercase tracking-wider">Date</span>
                      <span className="text-white/65">{fmtDate(openMessage.date)}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto styled-scrollbar">
                    {openMessage.html ? (
                      <iframe
                        title={openMessage.subject}
                        srcDoc={openMessage.html}
                        sandbox="allow-same-origin"
                        className="w-full min-h-[400px] bg-white"
                      />
                    ) : openMessage.text ? (
                      <pre className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-white/85 font-sans">{openMessage.text}</pre>
                    ) : (
                      <p className="p-5 text-sm text-white/55 italic">(Corps vide ou format non géré)</p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* Modal compte */}
      <AnimatePresence>
        {accountModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setAccountModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden">
              <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  {accountModal === "create" ? "Nouveau compte mail LWS" : "Modifier le compte mail"}
                </h3>
                <button onClick={() => setAccountModal(null)} className="text-white/55 hover:text-white transition text-xl">×</button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Libellé *</label>
                    <input value={form.label ?? ""} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inp} placeholder="Contact général" />
                  </div>
                  <div>
                    <label className={lbl}>Email LWS *</label>
                    <input type="email" value={form.email ?? ""} onChange={(e) => autofillFromEmail(e.target.value)} className={inp} placeholder="info@afrilexconseil.com" />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Mot de passe IMAP/SMTP {accountModal === "edit" ? "(laisser vide pour ne pas changer)" : "*"}</label>
                  <input type="password" autoComplete="new-password" value={form.password ?? ""} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inp} />
                  <p className="text-[11px] text-white/40 mt-1">Stocké chiffré AES-256-GCM. Côté LWS : panneau Webmail / Comptes mail → mot de passe associé à l'adresse.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className={lbl}>Hôte IMAP (réception)</label>
                    <input value={form.imap_host ?? ""} onChange={(e) => setForm((f) => ({ ...f, imap_host: e.target.value }))} className={inp} placeholder="mail.afrilexconseil.com" />
                  </div>
                  <div>
                    <label className={lbl}>Port IMAP</label>
                    <input type="number" value={String(form.imap_port ?? 993)} onChange={(e) => setForm((f) => ({ ...f, imap_port: +e.target.value }))} className={inp} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input type="checkbox" checked={!!form.imap_secure} onChange={(e) => setForm((f) => ({ ...f, imap_secure: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
                  IMAP sécurisé (SSL/TLS — recommandé port 993)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className={lbl}>Hôte SMTP (envoi)</label>
                    <input value={form.smtp_host ?? ""} onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))} className={inp} placeholder="mail.afrilexconseil.com" />
                  </div>
                  <div>
                    <label className={lbl}>Port SMTP</label>
                    <input type="number" value={String(form.smtp_port ?? 465)} onChange={(e) => setForm((f) => ({ ...f, smtp_port: +e.target.value }))} className={inp} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input type="checkbox" checked={!!form.smtp_secure} onChange={(e) => setForm((f) => ({ ...f, smtp_secure: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
                  SMTP sécurisé (SSL/TLS — recommandé port 465)
                </label>

                {accountModal === "edit" && (
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input type="checkbox" checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
                    Compte actif
                  </label>
                )}
              </div>

              <div className="border-t border-white/[0.07] px-6 py-4 flex flex-wrap gap-3">
                <button onClick={() => setAccountModal(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">
                  Annuler
                </button>
                {accountModal === "edit" && (
                  <button onClick={testConnection} disabled={testing} className="flex-1 rounded-xl border border-violet/20 bg-violet/10 py-3 text-sm font-bold text-violet hover:bg-violet/20 transition disabled:opacity-40">
                    {testing ? "Test…" : "Tester IMAP"}
                  </button>
                )}
                <button onClick={saveAccount} disabled={saving} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-40">
                  {saving ? "Enregistrement…" : (accountModal === "create" ? "Créer le compte" : "Enregistrer")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Composer */}
      <AnimatePresence>
        {composeOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setComposeOpen(false)}>
            <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
              className="my-8 w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden">
              <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  {compose.in_reply_to ? "Réponse" : (compose.subject.startsWith("Tr ") ? "Transférer" : "Nouveau message")}
                </h3>
                <button onClick={() => setComposeOpen(false)} className="text-white/55 hover:text-white transition text-xl">×</button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-white/55">
                  De : <span className="font-semibold text-white/85">{activeAccount?.label ?? "—"}</span>
                  <span className="text-white/45"> &lt;{activeAccount?.email ?? "—"}&gt;</span>
                </div>

                <div>
                  <label className={lbl}>À * <span className="font-normal text-white/35">(plusieurs adresses séparées par virgule)</span></label>
                  <input value={compose.to} onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))} className={inp} placeholder="prenom@exemple.com, autre@exemple.com" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Cc</label>
                    <input value={compose.cc} onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Cci (Bcc)</label>
                    <input value={compose.bcc} onChange={(e) => setCompose((c) => ({ ...c, bcc: e.target.value }))} className={inp} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Objet</label>
                  <input value={compose.subject} onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))} className={inp} />
                </div>

                <div>
                  <label className={lbl}>Message *</label>
                  <textarea
                    rows={14}
                    value={compose.text}
                    onChange={(e) => setCompose((c) => ({ ...c, text: e.target.value }))}
                    className={inp + " resize-y min-h-[260px] font-mono text-xs"}
                    placeholder="Bonjour,&#10;&#10;…"
                  />
                  <p className="text-[11px] text-white/40 mt-1">Texte brut. Pour réponse : le message original est cité au format quoté ci-dessous.</p>
                </div>

                {sendResult && (
                  <div className={`rounded-xl px-4 py-3 text-sm ${
                    sendResult.kind === "ok"
                      ? "border border-lime/30 bg-lime/10 text-lime"
                      : "border border-coral/30 bg-coral/10 text-coral"
                  }`}>
                    {sendResult.text}
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
                <button onClick={() => setComposeOpen(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">
                  Annuler
                </button>
                <button onClick={sendCompose} disabled={sending} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-40">
                  {sending ? "Envoi…" : "✈ Envoyer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
