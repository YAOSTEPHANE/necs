"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CONSENT_CHANNEL_LABELS,
  CONSENT_CHANNELS,
  CONSENT_PURPOSE_LABELS,
  CONSENT_PURPOSES,
  purposeIsAllowed,
  type ConsentAudienceSnapshot,
  type ConsentChannel,
  type ConsentPreference,
  type ConsentPurpose,
} from "@/lib/consent-preferences-shared";
import { downloadCsv } from "@/lib/download";
import { toast } from "@/lib/toast";

function formatWhen(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConsentPreferencesPanel() {
  const [items, setItems] = useState<ConsentPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const [audienceChannel, setAudienceChannel] =
    useState<ConsentChannel>("email");
  const [audiencePurpose, setAudiencePurpose] =
    useState<ConsentPurpose>("marketing");
  const [audience, setAudience] = useState<ConsentAudienceSnapshot | null>(
    null,
  );
  const [audienceBusy, setAudienceBusy] = useState(false);
  const [probeEmails, setProbeEmails] = useState("");
  const [probeResult, setProbeResult] = useState<{
    allowed: string[];
    blocked: Array<{ email: string; reason: string }>;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consent-preferences", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: ConsentPreference[];
        canManage?: boolean;
        error?: string;
      };
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setForbidden(false);
      setItems(data.items ?? []);
      setCanManage(Boolean(data.canManage));
      setSelectedEmail((prev) => prev ?? data.items?.[0]?.email ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadAudience = useCallback(async () => {
    setAudienceBusy(true);
    try {
      const res = await fetch(
        `/api/consent-preferences?audience=${encodeURIComponent(audienceChannel)}&purpose=${encodeURIComponent(audiencePurpose)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        audience?: ConsentAudienceSnapshot;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Audience impossible");
      setAudience(data.audience ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setAudienceBusy(false);
    }
  }, [audienceChannel, audiencePurpose]);

  useEffect(() => {
    if (forbidden || loading) return;
    void loadAudience();
  }, [forbidden, loading, loadAudience]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.email.includes(q) ||
        i.contactName.toLowerCase().includes(q) ||
        i.company.toLowerCase().includes(q),
    );
  }, [items, query]);

  const selected =
    filtered.find((i) => i.email === selectedEmail) ??
    items.find((i) => i.email === selectedEmail) ??
    null;

  async function post(body: Record<string, unknown>) {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/consent-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: ConsentPreference;
        items?: ConsentPreference[];
        created?: number;
        allowed?: string[];
        blocked?: Array<{ email: string; reason: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");

      if (body.action === "filter-emails") {
        setProbeResult({
          allowed: data.allowed ?? [],
          blocked: data.blocked ?? [],
        });
        toast.success(
          `${data.allowed?.length ?? 0} ciblable(s) · ${data.blocked?.length ?? 0} exclu(s)`,
        );
        return;
      }

      if (data.items) {
        setItems(data.items);
        toast.success(
          data.created
            ? `${data.created} fiche(s) importée(s) depuis les leads`
            : "Liste actualisée",
        );
      } else if (data.item) {
        setItems((prev) => {
          const rest = prev.filter((p) => p.email !== data.item!.email);
          return [data.item!, ...rest];
        });
        setSelectedEmail(data.item.email);
        toast.success("Préférences enregistrées");
        void loadAudience();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  function exportEligible() {
    if (!audience?.eligible.length) {
      toast.error("Aucun contact ciblable sur ce canal");
      return;
    }
    downloadCsv(
      [
        ["email", "nom", "entreprise", "canal", "finalite"],
        ...audience.eligible.map((r) => [
          r.email,
          r.contactName,
          r.company,
          audience.channelLabel,
          audience.purposeLabel,
        ]),
      ],
      `necs-audience-${audience.channel}-${audience.purpose}`,
    );
    toast.success(`Export · ${audience.eligible.length} contact(s) ciblables`);
  }

  const optedOut = items.filter((i) =>
    CONSENT_CHANNELS.some((c) => !i.channels[c]?.allowed),
  ).length;

  if (forbidden) {
    return (
      <div className="dig-feature consent-panel">
        <p className="dig-feature__empty">
          Accès restreint : réservé au marketing et à l’administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="dig-feature consent-panel">
      <header className="dig-feature__head">
        <div>
          <p className="dig-feature__eyebrow">Consentement</p>
          <h2>Consentement & préférences</h2>
          <p>
            Enregistrer ou retirer une préférence de communication (date,
            finalité, canal). Accès marketing / admin. Un retrait exclut le
            contact du ciblage sur le canal concerné.
          </p>
        </div>
        <div className="dig-feature__meta">
          <span>
            <strong>{items.length}</strong> contacts
          </span>
          <span>
            <strong>{optedOut}</strong> retraits
          </span>
          <span>
            <strong>{audience?.eligible.length ?? "—"}</strong> ciblables
          </span>
        </div>
      </header>

      <section className="consent-audience" aria-label="Ciblage par canal">
        <header>
          <h3>Recette ciblage</h3>
          <p>
            Après un retrait canal / finalité, le contact disparaît des
            ciblables et est listé dans « Exclus ».
          </p>
        </header>
        <div className="consent-audience__controls">
          <label>
            Canal
            <select
              value={audienceChannel}
              onChange={(e) =>
                setAudienceChannel(e.target.value as ConsentChannel)
              }
            >
              {CONSENT_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CONSENT_CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Finalité
            <select
              value={audiencePurpose}
              onChange={(e) =>
                setAudiencePurpose(e.target.value as ConsentPurpose)
              }
            >
              {CONSENT_PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {CONSENT_PURPOSE_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={audienceBusy}
            onClick={() => void loadAudience()}
          >
            {audienceBusy ? "Calcul…" : "Calculer l’audience"}
          </button>
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={!audience?.eligible.length}
            onClick={exportEligible}
          >
            Exporter ciblables (CSV)
          </button>
        </div>

        {audience ? (
          <div className="consent-audience__split">
            <div>
              <h4>
                Ciblables ({audience.eligible.length}/{audience.total})
              </h4>
              <ul>
                {audience.eligible.slice(0, 40).map((r) => (
                  <li key={r.email}>
                    <strong>{r.contactName || r.email}</strong>
                    <span>{r.email}</span>
                  </li>
                ))}
                {audience.eligible.length === 0 ? (
                  <li className="dig-feature__empty">Aucun ciblable</li>
                ) : null}
              </ul>
            </div>
            <div>
              <h4>
                Exclus ({audience.excluded.length}/{audience.total})
              </h4>
              <ul>
                {audience.excluded.slice(0, 40).map((r) => (
                  <li key={r.email} className="is-blocked">
                    <strong>{r.contactName || r.email}</strong>
                    <span>{r.email}</span>
                    <em>{r.reason}</em>
                  </li>
                ))}
                {audience.excluded.length === 0 ? (
                  <li className="dig-feature__empty">Aucun exclu</li>
                ) : null}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="consent-probe">
          <h4>Sonde e-mails (filtre ciblage)</h4>
          <textarea
            value={probeEmails}
            onChange={(e) => setProbeEmails(e.target.value)}
            placeholder="coller des e-mails (séparés par virgule ou ligne)"
            rows={2}
          />
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy || !probeEmails.trim()}
            onClick={() =>
              void post({
                action: "filter-emails",
                channel: audienceChannel,
                purpose: audiencePurpose,
                emails: probeEmails,
              })
            }
          >
            Filtrer la liste
          </button>
          {probeResult ? (
            <p>
              <strong>{probeResult.allowed.length}</strong> autorisé(s)
              {probeResult.blocked.length > 0 ? (
                <>
                  {" · "}
                  <strong>{probeResult.blocked.length}</strong> bloqué(s)
                  {probeResult.blocked.slice(0, 3).map((b) => (
                    <span key={b.email}> — {b.email}</span>
                  ))}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>

      <div className="dig-feature__toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher e-mail, nom…"
          aria-label="Recherche consentements"
        />
        {canManage ? (
          <>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              disabled={busy}
              onClick={() => void post({ action: "seed" })}
            >
              Importer depuis leads
            </button>
            <form
              className="consent-add"
              onSubmit={(e) => {
                e.preventDefault();
                void post({
                  action: "ensure",
                  email: newEmail,
                  contactName: newName,
                }).then(() => {
                  setNewEmail("");
                  setNewName("");
                });
              }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom"
              />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e-mail"
              />
              <button
                type="submit"
                className="btn-admin btn-admin--primary"
                disabled={busy}
              >
                Ajouter
              </button>
            </form>
          </>
        ) : null}
      </div>

      {loading ? (
        <p className="dig-feature__empty">Chargement…</p>
      ) : (
        <div className="dig-feature__split">
          <ul className="dig-feature__list" role="listbox">
            {filtered.map((item) => {
              const blocked = CONSENT_CHANNELS.filter(
                (c) => !item.channels[c]?.allowed,
              ).length;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      selected?.email === item.email
                        ? "dig-feature__row is-active"
                        : "dig-feature__row"
                    }
                    onClick={() => setSelectedEmail(item.email)}
                  >
                    <strong>{item.contactName || item.email}</strong>
                    <span>{item.email}</span>
                    <em>
                      {blocked > 0
                        ? `${blocked} canal(aux) retiré(s)`
                        : "Tous canaux OK"}
                    </em>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="dig-feature__empty">Aucun contact.</li>
            ) : null}
          </ul>

          <article className="dig-feature__detail">
            {!selected ? (
              <p className="dig-feature__empty">
                Sélectionnez un contact pour gérer ses préférences.
              </p>
            ) : (
              <>
                <header>
                  <h3>{selected.contactName || selected.email}</h3>
                  <p>
                    {selected.email}
                    {selected.company ? ` · ${selected.company}` : ""}
                  </p>
                </header>

                <section>
                  <h4>Canaux (avec date de mise à jour)</h4>
                  <ul className="consent-channels">
                    {CONSENT_CHANNELS.map((channel) => {
                      const state = selected.channels[channel];
                      const allowed = state?.allowed !== false;
                      return (
                        <li key={channel}>
                          <div>
                            <strong>{CONSENT_CHANNEL_LABELS[channel]}</strong>
                            <span>
                              {allowed ? "Autorisé" : "Retiré"}
                              {state?.updatedAt
                                ? ` · ${formatWhen(state.updatedAt)}`
                                : " · jamais modifié"}
                              {state?.updatedByName
                                ? ` · ${state.updatedByName}`
                                : ""}
                            </span>
                            {state?.note ? <em>{state.note}</em> : null}
                          </div>
                          {canManage ? (
                            <button
                              type="button"
                              className={
                                allowed
                                  ? "btn-admin btn-admin--ghost"
                                  : "btn-admin btn-admin--primary"
                              }
                              disabled={busy}
                              onClick={() =>
                                void post({
                                  action: "channel",
                                  email: selected.email,
                                  channel,
                                  allowed: !allowed,
                                  note: allowed
                                    ? "Retrait demandé"
                                    : "Réautorisation",
                                })
                              }
                            >
                              {allowed ? "Retirer" : "Réautoriser"}
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section>
                  <h4>Finalités (avec date)</h4>
                  <ul className="consent-purposes">
                    {CONSENT_PURPOSES.map((purpose) => {
                      const state = selected.purposes[purpose];
                      const allowed = purposeIsAllowed(state);
                      return (
                        <li key={purpose}>
                          <div>
                            <label>
                              <input
                                type="checkbox"
                                checked={allowed}
                                disabled={!canManage || busy}
                                onChange={() =>
                                  void post({
                                    action: "purpose",
                                    email: selected.email,
                                    purpose,
                                    allowed: !allowed,
                                    note: allowed
                                      ? "Retrait finalité"
                                      : "Enregistrement finalité",
                                  })
                                }
                              />
                              {CONSENT_PURPOSE_LABELS[purpose]}
                            </label>
                            <span className="consent-purpose__meta">
                              {allowed ? "Enregistrée" : "Retirée"}
                              {typeof state === "object" && state?.updatedAt
                                ? ` · ${formatWhen(state.updatedAt)}`
                                : ""}
                              {typeof state === "object" && state?.updatedByName
                                ? ` · ${state.updatedByName}`
                                : ""}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section>
                  <h4>Historique (traçabilité)</h4>
                  <ol className="consent-history">
                    {selected.history.slice(0, 20).map((h) => (
                      <li key={h.id}>
                        <time>{formatWhen(h.at)}</time>
                        <span>
                          {h.byName} — {h.detail}
                        </span>
                      </li>
                    ))}
                    {selected.history.length === 0 ? (
                      <li>Aucun événement.</li>
                    ) : null}
                  </ol>
                </section>
              </>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
