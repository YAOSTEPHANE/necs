"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/admin/Ui";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwBlock,
  FwChips,
  FwChip,
  FwReview,
  FwReviewCard,
} from "@/components/admin/form-wizard";
import { IconMail, IconSearch, IconUser } from "@/components/admin/Icons";
import {
  DIGITAL_CHANNEL_LABELS,
  DIGITAL_CHANNELS,
  DIGITAL_CONVERT_KINDS,
  DIGITAL_CONVERT_LABELS,
  DIGITAL_PRIORITIES,
  DIGITAL_PRIORITY_LABELS,
  DIGITAL_STATUS_LABELS,
  slaLabel,
  type DigitalChannel,
  type DigitalConvertKind,
  type DigitalPriority,
  type DigitalRequest,
  type DigitalRequestStatus,
} from "@/lib/digital-requests-shared";
import { toast } from "@/lib/toast";

type Filter =
  | "all"
  | "ouverts"
  | "retard"
  | DigitalRequestStatus;

type Draft = {
  channel: DigitalChannel;
  subject: string;
  message: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  company: string;
  priority: DigitalPriority;
  assigneeEmail: string;
  assigneeName: string;
};

const EMPTY: Draft = {
  channel: "contact",
  subject: "",
  message: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  company: "",
  priority: "normale",
  assigneeEmail: "",
  assigneeName: "",
};

function formatWhen(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DigitalRequestsWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<DigitalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ouverts");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<
    "message" | "contact" | "revue"
  >("message");
  const [composerShake, setComposerShake] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignName, setAssignName] = useState("");
  const [closeNote, setCloseNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/digital-requests", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: DigitalRequest[];
        canManage?: boolean;
        email?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setItems(data.items ?? []);
      setCanManage(Boolean(data.canManage));
      setEmail((data.email ?? "").toLowerCase());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const counts = useMemo(() => {
    const open = items.filter(
      (i) => i.status !== "clos" && i.status !== "annule",
    );
    return {
      all: items.length,
      ouverts: open.length,
      retard: open.filter((i) => i.slaBreached).length,
      nouveau: items.filter((i) => i.status === "nouveau").length,
      affecte: items.filter((i) => i.status === "affecte").length,
      en_cours: items.filter((i) => i.status === "en_cours").length,
      converti: items.filter((i) => i.status === "converti").length,
      clos: items.filter((i) => i.status === "clos").length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "ouverts") {
        if (item.status === "clos" || item.status === "annule") return false;
      } else if (filter === "retard") {
        if (!item.slaBreached || item.status === "clos" || item.status === "annule") {
          return false;
        }
      } else if (filter !== "all" && item.status !== filter) {
        return false;
      }
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.contactName.toLowerCase().includes(q) ||
        item.contactEmail.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  async function createRequest(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/digital-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as {
        item?: DigitalRequest;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création échouée");
      toast.success("Demande créée");
      setComposerOpen(false);
      setComposerStep("message");
      setDraft({ ...EMPTY, assigneeEmail: email });
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const messageReady =
    Boolean(draft.subject.trim()) && Boolean(draft.message.trim());
  const pulseComposerError = () => {
    setComposerShake(true);
    window.setTimeout(() => setComposerShake(false), 420);
  };
  const canEnterComposerStep = (id: string) => {
    if (id === "message") return true;
    return messageReady;
  };

  async function patch(
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    if (!selectedId) return;
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/digital-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId, action, ...extra }),
      });
      const data = (await res.json()) as {
        item?: DigitalRequest;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action échouée");
      await refresh();
      if (data.item) setSelectedId(data.item.id);
      toast.success("Mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (selected) {
      setAssignEmail(selected.assigneeEmail || email);
      setAssignName(selected.assigneeName || "");
    }
  }, [selected, email]);

  const sla = selected ? slaLabel(selected) : "OK";

  return (
    <div
      className={
        embedded
          ? "leads-page digmsg-page leads-page--embedded"
          : "leads-page digmsg-page"
      }
    >
      {embedded ? (
        <div className="dig-feature__toolbar">
          <p className="dig-feature__eyebrow">Messages & SLA</p>
          <div className="dig-hub__inline-actions">
            <span>
              <strong>{counts.ouverts}</strong> ouverts
            </span>
            <span>
              <strong>{counts.retard}</strong> hors SLA
            </span>
            {canManage ? (
              <button
                type="button"
                className="btn-admin btn-admin--primary"
                onClick={() => {
                  setDraft({ ...EMPTY, assigneeEmail: email });
                  setComposerOpen(true);
                  setComposerStep("message");
                }}
              >
                Nouvelle demande
              </button>
            ) : null}
            <button
              type="button"
              className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Actualiser
            </button>
          </div>
        </div>
      ) : (
        <ModuleHeader
          tone="#0ea5e9"
          badge="Digital"
          icon={<IconMail size={20} />}
          title="Demandes / messages digitaux"
          meta={
            <>
              <span>
                <strong>{counts.ouverts}</strong> ouverts
              </span>
              <span>
                <strong>{counts.retard}</strong> hors SLA
              </span>
              <span>
                <strong>{counts.converti}</strong> convertis
              </span>
              <span>
                <strong>{counts.clos}</strong> clos
              </span>
            </>
          }
          actions={
            <>
              {canManage ? (
                <button
                  type="button"
                  className="btn-admin btn-admin--primary"
                  onClick={() => {
                    setDraft({ ...EMPTY, assigneeEmail: email });
                    setComposerOpen(true);
                  setComposerStep("message");
                  }}
                >
                  Nouvelle demande
                </button>
              ) : null}
              <button
                type="button"
                className={`btn-admin btn-admin--ghost${loading ? " is-busy" : ""}`}
                onClick={() => void refresh()}
                disabled={loading}
              >
                Actualiser
              </button>
            </>
          }
        />
      )}

      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sujet, contact, id…"
          />
        </label>
        <div className="leads-filters">
          {(
            [
              ["ouverts", "Ouverts"],
              ["retard", "Hors SLA"],
              ["nouveau", "Nouveaux"],
              ["en_cours", "En cours"],
              ["converti", "Convertis"],
              ["clos", "Clos"],
              ["all", "Tous"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
              <em>
                {id === "ouverts"
                  ? counts.ouverts
                  : id === "retard"
                    ? counts.retard
                    : id === "all"
                      ? counts.all
                      : counts[id as keyof typeof counts] ?? 0}
              </em>
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <p className="leads-empty">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="leads-empty">
          <p className="leads-empty__eyebrow">Messages</p>
          <h2>Aucune demande sur ce filtre</h2>
          <p>
            Transformez un message digital en lead, tâche, opportunité ou
            ticket — avec affectation, SLA et historique.
          </p>
          {canManage ? (
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                setDraft({ ...EMPTY, assigneeEmail: email });
                setComposerStep("message");
                setComposerOpen(true);
              }}
            >
              Créer une demande
            </button>
          ) : null}
        </div>
      ) : (
        <div className="leads-shell">
          <ul className="leads-inbox" aria-label="Messages digitaux">
            {filtered.map((item) => {
              const active = selectedId === item.id;
              const tag = slaLabel(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`leads-card${active ? " is-active" : ""}${item.slaBreached && item.status !== "clos" ? " is-new" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="leads-card__avatar" aria-hidden>
                      <IconUser size={16} />
                    </span>
                    <span className="leads-card__body">
                      <span className="leads-card__top">
                        <strong>{item.subject}</strong>
                        <time dateTime={item.updatedAt}>
                          {formatWhen(item.updatedAt)}
                        </time>
                      </span>
                      <span className="leads-card__mid">
                        <span className="leads-pill">
                          {DIGITAL_CHANNEL_LABELS[item.channel]}
                        </span>
                        <span
                          className={`digmsg-status digmsg-status--${item.status}`}
                        >
                          {DIGITAL_STATUS_LABELS[item.status]}
                        </span>
                        <span
                          className={`digmsg-sla digmsg-sla--${tag === "Retard" || tag === "Clos hors SLA" ? "late" : "ok"}`}
                        >
                          {tag}
                        </span>
                      </span>
                      <span className="leads-card__preview">
                        {item.contactName || item.contactEmail || "—"} ·{" "}
                        {DIGITAL_PRIORITY_LABELS[item.priority]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <article className="leads-detail digmsg-detail" aria-live="polite">
            {!selected ? (
              <div className="leads-empty-detail">
                <p>Sélectionnez une demande pour affecter, convertir ou clôturer.</p>
              </div>
            ) : (
              <>
                <header className="leads-detail__head">
                  <div className="leads-detail__identity">
                    <span className="leads-detail__avatar" aria-hidden>
                      <IconMail size={18} />
                    </span>
                    <div>
                      <p className="leads-detail__eyebrow">
                        <span className="leads-pill">
                          {DIGITAL_CHANNEL_LABELS[selected.channel]}
                        </span>
                        <span
                          className={`digmsg-status digmsg-status--${selected.status}`}
                        >
                          {DIGITAL_STATUS_LABELS[selected.status]}
                        </span>
                        <span
                          className={`digmsg-sla digmsg-sla--${sla === "Retard" || sla === "Clos hors SLA" ? "late" : "ok"}`}
                        >
                          SLA {sla}
                        </span>
                        <span>{selected.id}</span>
                      </p>
                      <h2>{selected.subject}</h2>
                      <p className="leads-detail__sub">
                        Échéance {formatWhen(selected.slaDueAt)} ·{" "}
                        {selected.slaHours}h ·{" "}
                        {DIGITAL_PRIORITY_LABELS[selected.priority]}
                      </p>
                    </div>
                  </div>
                </header>

                <dl className="leads-detail__meta">
                  <div>
                    <dt>Contact</dt>
                    <dd>
                      {selected.contactName || "—"}
                      <br />
                      <small>{selected.contactEmail || "—"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Téléphone / société</dt>
                    <dd>
                      {selected.contactPhone || "—"}
                      <br />
                      <small>{selected.company || "—"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Affectation</dt>
                    <dd>
                      {selected.assigneeName || "Non affecté"}
                      <br />
                      <small>{selected.assigneeEmail || "—"}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Conversion</dt>
                    <dd>
                      {selected.conversion
                        ? `${DIGITAL_CONVERT_LABELS[selected.conversion.kind]} · ${selected.conversion.refId}`
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="leads-detail__message">
                  <div className="leads-detail__message-head">
                    <h3>Message</h3>
                  </div>
                  <pre>{selected.message}</pre>
                </div>

                {canManage &&
                selected.status !== "clos" &&
                selected.status !== "annule" ? (
                  <div className="recruit-actions digmsg-actions">
                    <h3>Actions</h3>
                    <div className="recruit-actions__row">
                      <input
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        placeholder="E-mail destinataire"
                      />
                      <input
                        value={assignName}
                        onChange={(e) => setAssignName(e.target.value)}
                        placeholder="Nom"
                      />
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void patch("assign", {
                            assigneeEmail: assignEmail,
                            assigneeName: assignName,
                          })
                        }
                      >
                        Affecter
                      </button>
                    </div>

                    <div className="recruit-actions__row">
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={busy}
                        onClick={() =>
                          void patch("status", { status: "en_cours" })
                        }
                      >
                        En cours
                      </button>
                      {DIGITAL_PRIORITIES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy || selected.priority === p}
                          onClick={() => void patch("priority", { priority: p })}
                        >
                          {DIGITAL_PRIORITY_LABELS[p]}
                        </button>
                      ))}
                    </div>

                    {!selected.conversion ? (
                      <div className="digmsg-convert">
                        <p>Transformer en</p>
                        <div className="recruit-actions__row">
                          {DIGITAL_CONVERT_KINDS.map((kind) => (
                            <button
                              key={kind}
                              type="button"
                              className="btn-admin btn-admin--primary"
                              disabled={busy}
                              onClick={() =>
                                void patch("convert", { kind })
                              }
                            >
                              {DIGITAL_CONVERT_LABELS[kind as DigitalConvertKind]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="digmsg-converted">
                        Converti en{" "}
                        <strong>
                          {DIGITAL_CONVERT_LABELS[selected.conversion.kind]}
                        </strong>{" "}
                        ({selected.conversion.refId})
                        {selected.conversion.kind === "lead" ? (
                          <>
                            {" · "}
                            <Link href="/admin/demandes">Voir leads</Link>
                          </>
                        ) : null}
                      </p>
                    )}

                    <div className="recruit-actions__row">
                      <input
                        value={closeNote}
                        onChange={(e) => setCloseNote(e.target.value)}
                        placeholder="Note de clôture"
                      />
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={busy}
                        onClick={() =>
                          void patch("close", { note: closeNote })
                        }
                      >
                        Clôturer
                      </button>
                    </div>
                  </div>
                ) : null}

                {selected.status === "clos" ? (
                  <p className="digmsg-closed">
                    Clôturée le {formatWhen(selected.closedAt ?? "")} · SLA{" "}
                    {sla}
                    {canManage ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className="btn-admin btn-admin--ghost"
                          disabled={busy}
                          onClick={() =>
                            void patch("status", { status: "en_cours" })
                          }
                        >
                          Rouvrir
                        </button>
                      </>
                    ) : null}
                  </p>
                ) : null}

                <div className="recruit-history">
                  <h3>Historique</h3>
                  <ol>
                    {selected.history.map((h) => (
                      <li key={h.id}>
                        <strong>{h.kind}</strong>
                        <span>
                          {formatWhen(h.at)} · {h.byName}
                        </span>
                        <p>{h.detail}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </article>
        </div>
      )}

      <AdminFormWizard
        open={composerOpen}
        portal
        onClose={() => {
          setComposerOpen(false);
          setComposerStep("message");
        }}
        titleId="digmsg-create-title"
        eyebrow="Message"
        title="Nouvelle demande"
        lead="Canal digital → affectation · SLA · conversion."
        steps={[
          { id: "message", label: "Message", hint: "Canal & contenu" },
          { id: "contact", label: "Contact", hint: "Affectation" },
          { id: "revue", label: "Revue", hint: "Contrôle avant création" },
        ]}
        stepId={composerStep}
        onStepChange={(id) =>
          setComposerStep(id as "message" | "contact" | "revue")
        }
        canEnterStep={canEnterComposerStep}
        onStepBlocked={pulseComposerError}
        shake={composerShake}
        formId="digmsg-create"
        onSubmit={(e) => void createRequest(e)}
        submitLabel="Créer"
        busy={busy}
        canSubmit={messageReady}
      >
        {composerStep === "message" ? (
          <FwPanel aria-label="Message">
            <FwPanelHead
              title="Contenu du message"
              description="Canal, priorité SLA et corps du message."
            />
            <FwBlock>
              <FwPanelHead title="Canal" />
              <FwChips>
                {DIGITAL_CHANNELS.map((c) => (
                  <FwChip
                    key={c}
                    selected={draft.channel === c}
                    title={DIGITAL_CHANNEL_LABELS[c]}
                    onClick={() =>
                      setDraft((d) => ({ ...d, channel: c }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
            <FwBlock>
              <FwPanelHead title="Priorité (SLA)" />
              <FwChips>
                {DIGITAL_PRIORITIES.map((p) => (
                  <FwChip
                    key={p}
                    selected={draft.priority === p}
                    title={DIGITAL_PRIORITY_LABELS[p]}
                    onClick={() =>
                      setDraft((d) => ({ ...d, priority: p }))
                    }
                  />
                ))}
              </FwChips>
            </FwBlock>
            <FwGrid>
              <FwField label="Sujet *" wide>
                <input
                  required
                  autoFocus
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, subject: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Message *" wide>
                <textarea
                  required
                  rows={5}
                  value={draft.message}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, message: e.target.value }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "contact" ? (
          <FwPanel aria-label="Contact">
            <FwPanelHead
              title="Contact & affectation"
              description="Coordonnées de l’émetteur et destinataire interne."
            />
            <FwGrid>
              <FwField label="Nom">
                <input
                  value={draft.contactName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      contactName: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="E-mail">
                <input
                  type="email"
                  value={draft.contactEmail}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      contactEmail: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Téléphone">
                <input
                  value={draft.contactPhone}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      contactPhone: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Société">
                <input
                  value={draft.company}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, company: e.target.value }))
                  }
                />
              </FwField>
              <FwField label="Affecter à (e-mail)">
                <input
                  type="email"
                  value={draft.assigneeEmail}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      assigneeEmail: e.target.value,
                    }))
                  }
                />
              </FwField>
              <FwField label="Nom destinataire">
                <input
                  value={draft.assigneeName}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      assigneeName: e.target.value,
                    }))
                  }
                />
              </FwField>
            </FwGrid>
          </FwPanel>
        ) : null}

        {composerStep === "revue" ? (
          <FwPanel aria-label="Revue">
            <FwPanelHead
              title="Revue avant création"
              description="Vérifiez le message et l’affectation."
            />
            <FwReview>
              <FwReviewCard
                title="Message"
                rows={[
                  {
                    label: "Canal",
                    value: DIGITAL_CHANNEL_LABELS[draft.channel],
                  },
                  {
                    label: "Priorité",
                    value: DIGITAL_PRIORITY_LABELS[draft.priority],
                  },
                  { label: "Sujet", value: draft.subject || "—" },
                  {
                    label: "Message",
                    value: draft.message.trim() || "—",
                  },
                ]}
              />
              <FwReviewCard
                title="Contact"
                rows={[
                  { label: "Nom", value: draft.contactName || "—" },
                  { label: "E-mail", value: draft.contactEmail || "—" },
                  { label: "Téléphone", value: draft.contactPhone || "—" },
                  { label: "Société", value: draft.company || "—" },
                  {
                    label: "Affecté à",
                    value: draft.assigneeName
                      ? `${draft.assigneeName} · ${draft.assigneeEmail}`
                      : draft.assigneeEmail || "—",
                  },
                ]}
              />
            </FwReview>
          </FwPanel>
        ) : null}
      </AdminFormWizard>
    </div>
  );
}
