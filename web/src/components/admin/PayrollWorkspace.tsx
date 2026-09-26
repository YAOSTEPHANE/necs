"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { RhWorkspaceShell } from "@/components/admin/RhWorkspaceShell";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwReview,
  FwReviewCard,
} from "@/components/admin/form-wizard";
import { IconCredit, IconSearch } from "@/components/admin/Icons";
import {
  computePayslip,
  currentPayrollPeriod,
  formatXaf,
  PAYMENT_METHODS,
  periodLabel,
  PAYSLIP_STATUS_LABELS,
  type Payslip,
  type PayslipStatus,
} from "@/lib/payroll-shared";
import { toast } from "@/lib/toast";

type Draft = {
  period: string;
  employeeName: string;
  employeeEmail: string;
  matricule: string;
  jobTitle: string;
  site: string;
  cnpsNumber: string;
  baseSalary: string;
  transportAllowance: string;
  primes: string;
  overtimeHours: string;
  otherGains: string;
  otherDeductions: string;
  paymentMethod: string;
  note: string;
};

const EMPTY_DRAFT: Draft = {
  period: currentPayrollPeriod(),
  employeeName: "",
  employeeEmail: "",
  matricule: "",
  jobTitle: "",
  site: "",
  cnpsNumber: "",
  baseSalary: "",
  transportAllowance: "25000",
  primes: "0",
  overtimeHours: "0",
  otherGains: "0",
  otherDeductions: "0",
  paymentMethod: "Virement bancaire",
  note: "",
};

type Filter = "all" | PayslipStatus;

type PeriodSummary = {
  period: string;
  count: number;
  grossTotal: number;
  netTotal: number;
  cnpsEmployeeTotal: number;
  cnpsEmployerTotal: number;
  irppTotal: number;
};

function formatWhen(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function n(v: string): number {
  const x = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
}

export function PayrollWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [items, setItems] = useState<Payslip[]>([]);
  const [period, setPeriod] = useState(currentPayrollPeriod());
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [canValidate, setCanValidate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        fetch(`/api/payroll?period=${encodeURIComponent(period)}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/payroll?period=${encodeURIComponent(period)}&summary=1`,
          { cache: "no-store" },
        ),
      ]);
      const listData = (await listRes.json()) as {
        items?: Payslip[];
        canManage?: boolean;
        canValidate?: boolean;
        error?: string;
      };
      const sumData = (await sumRes.json()) as {
        summary?: PeriodSummary;
        error?: string;
      };
      if (!listRes.ok) throw new Error(listData.error || "Chargement impossible");
      setItems(listData.items ?? []);
      setCanManage(Boolean(listData.canManage));
      setCanValidate(Boolean(listData.canValidate));
      setSummary(sumData.summary ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.employeeName.toLowerCase().includes(q) ||
        item.matricule.toLowerCase().includes(q) ||
        item.site.toLowerCase().includes(q) ||
        item.jobTitle.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const preview = useMemo(
    () =>
      computePayslip({
        baseSalary: n(draft.baseSalary),
        transportAllowance: n(draft.transportAllowance),
        primes: n(draft.primes),
        overtimeHours: n(draft.overtimeHours),
        otherGains: n(draft.otherGains),
        otherDeductions: n(draft.otherDeductions),
      }),
    [draft],
  );

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: Payslip;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Action impossible");
      toast.success("Bulletin mis à jour");
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: draft.period,
          employeeName: draft.employeeName,
          employeeEmail: draft.employeeEmail,
          matricule: draft.matricule,
          jobTitle: draft.jobTitle,
          site: draft.site,
          cnpsNumber: draft.cnpsNumber,
          baseSalary: n(draft.baseSalary),
          transportAllowance: n(draft.transportAllowance),
          primes: n(draft.primes),
          overtimeHours: n(draft.overtimeHours),
          otherGains: n(draft.otherGains),
          otherDeductions: n(draft.otherDeductions),
          paymentMethod: draft.paymentMethod,
          note: draft.note,
        }),
      });
      const data = (await res.json()) as {
        item?: Payslip;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Création impossible");
      toast.success("Bulletin créé");
      setComposerOpen(false);
      setDraft({ ...EMPTY_DRAFT, period });
      if (data.item?.period) setPeriod(data.item.period);
      await refresh();
      if (data.item) setSelectedId(data.item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RhWorkspaceShell
      embedded={embedded}
      badge="Paie"
      eyebrow="Paie collaborateurs"
      icon={<IconCredit size={20} />}
      title="Bulletins de paie"
      meta={
        <>
          <span>
            Période · <strong>{periodLabel(period)}</strong>
          </span>
          <span>
            {summary
              ? `${summary.count} bulletin${summary.count > 1 ? "s" : ""} · Net ${formatXaf(summary.netTotal)}`
              : "CNPS · IRPP · net à payer"}
          </span>
        </>
      }
      actions={
        canManage ? (
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            onClick={() => {
              setDraft({ ...EMPTY_DRAFT, period });
              setComposerOpen(true);
            }}
          >
            Nouveau bulletin
          </button>
        ) : null
      }
      testId="payroll-workspace"
    >
      <div className="leads-toolbar">
        <label className="leads-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, matricule, site…"
          />
        </label>
        <label className="fw-field" style={{ minWidth: "9rem", margin: 0 }}>
          <span className="sr-only">Période</span>
          <input
            type="month"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              setSelectedId(null);
            }}
          />
        </label>
        <div className="leads-filters">
          {(
            [
              ["all", "Tous"],
              ["calcule", "Calculés"],
              ["valide", "Validés"],
              ["paye", "Payés"],
              ["annule", "Annulés"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`leads-chip${filter === id ? " is-active" : ""}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {summary ? (
        <div className="payroll-kpis" aria-label="Totaux période">
          <div>
            <em>Brut</em>
            <strong>{formatXaf(summary.grossTotal)}</strong>
          </div>
          <div>
            <em>CNPS salariés</em>
            <strong>{formatXaf(summary.cnpsEmployeeTotal)}</strong>
          </div>
          <div>
            <em>CNPS employeur</em>
            <strong>{formatXaf(summary.cnpsEmployerTotal)}</strong>
          </div>
          <div>
            <em>IRPP</em>
            <strong>{formatXaf(summary.irppTotal)}</strong>
          </div>
          <div>
            <em>Net à payer</em>
            <strong>{formatXaf(summary.netTotal)}</strong>
          </div>
        </div>
      ) : null}

      <div className="leads-layout">
        <div className="leads-list" role="list">
          {loading ? (
            <p className="leads-empty">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="leads-empty">Aucun bulletin pour cette période.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                role="listitem"
                className={`leads-card${selectedId === item.id ? " is-active" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="leads-card__top">
                  <strong>{item.employeeName}</strong>
                  <span className={`leads-chip status-${item.status}`}>
                    {PAYSLIP_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p>
                  {item.jobTitle || "Poste"} · {formatXaf(item.net)}
                </p>
                <span className="leads-card__meta">
                  {item.matricule || "Sans matricule"} · {formatWhen(item.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>

        <article className="leads-detail">
          {!selected ? (
            <p className="leads-empty">Sélectionnez un bulletin.</p>
          ) : (
            <>
              <header className="leads-detail__head">
                <div>
                  <p className="leads-detail__eyebrow">
                    {periodLabel(selected.period)}
                  </p>
                  <h3>{selected.employeeName}</h3>
                </div>
                <span className={`leads-chip status-${selected.status}`}>
                  {PAYSLIP_STATUS_LABELS[selected.status]}
                </span>
              </header>

              <dl className="docsig-meta" style={{ marginTop: "1rem" }}>
                <div>
                  <dt>Matricule</dt>
                  <dd>{selected.matricule || "—"}</dd>
                </div>
                <div>
                  <dt>Poste</dt>
                  <dd>{selected.jobTitle || "—"}</dd>
                </div>
                <div>
                  <dt>Site</dt>
                  <dd>{selected.site || "—"}</dd>
                </div>
                <div>
                  <dt>N° CNPS</dt>
                  <dd>{selected.cnpsNumber || "—"}</dd>
                </div>
                <div>
                  <dt>Salaire de base</dt>
                  <dd>{formatXaf(selected.baseSalary)}</dd>
                </div>
                <div>
                  <dt>Transport</dt>
                  <dd>{formatXaf(selected.transportAllowance)}</dd>
                </div>
                <div>
                  <dt>Primes</dt>
                  <dd>{formatXaf(selected.primes)}</dd>
                </div>
                <div>
                  <dt>Heures supp.</dt>
                  <dd>
                    {selected.overtimeHours} h ·{" "}
                    {formatXaf(selected.overtimeAmount)}
                  </dd>
                </div>
                <div>
                  <dt>Brut</dt>
                  <dd>{formatXaf(selected.gross)}</dd>
                </div>
                <div>
                  <dt>CNPS salarié</dt>
                  <dd>{formatXaf(selected.cnpsEmployee)}</dd>
                </div>
                <div>
                  <dt>IRPP</dt>
                  <dd>{formatXaf(selected.irpp)}</dd>
                </div>
                <div>
                  <dt>Net à payer</dt>
                  <dd>
                    <strong>{formatXaf(selected.net)}</strong>
                  </dd>
                </div>
                <div>
                  <dt>Paiement</dt>
                  <dd>{selected.paymentMethod || "—"}</dd>
                </div>
                {selected.paidAt ? (
                  <div>
                    <dt>Payé le</dt>
                    <dd>{formatWhen(selected.paidAt)}</dd>
                  </div>
                ) : null}
                {selected.note ? (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <dt>Note</dt>
                    <dd>{selected.note}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="payroll-lines">
                <h4>Rubriques</h4>
                <ul>
                  {selected.lines.map((line) => (
                    <li key={line.code} data-kind={line.kind}>
                      <span>{line.label}</span>
                      <strong>
                        {line.kind === "retenue" ? "− " : ""}
                        {formatXaf(line.amount)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="recruit-actions" style={{ marginTop: "1rem" }}>
                <a
                  className="btn-admin"
                  href={`/admin/templates/tmp-26`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Modèle bulletin (TMP-26)
                </a>
                <button
                  type="button"
                  className="btn-admin"
                  onClick={() => window.print()}
                >
                  Imprimer fiche
                </button>
                {canValidate &&
                (selected.status === "calcule" ||
                  selected.status === "brouillon") ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() =>
                      void patch({ id: selected.id, action: "validate" })
                    }
                  >
                    Valider
                  </button>
                ) : null}
                {canValidate && selected.status === "valide" ? (
                  <button
                    type="button"
                    className="btn-admin btn-admin--primary"
                    disabled={busy}
                    onClick={() =>
                      void patch({
                        id: selected.id,
                        action: "pay",
                        paymentMethod: selected.paymentMethod,
                      })
                    }
                  >
                    Marquer payé
                  </button>
                ) : null}
                {canManage &&
                selected.status !== "paye" &&
                selected.status !== "annule" ? (
                  <button
                    type="button"
                    className="btn-admin"
                    disabled={busy}
                    onClick={() =>
                      void patch({
                        id: selected.id,
                        action: "cancel",
                        note: "Annulation RH",
                      })
                    }
                  >
                    Annuler
                  </button>
                ) : null}
              </div>

              {selected.history.length > 0 ? (
                <div className="payroll-history">
                  <h4>Historique</h4>
                  <ol>
                    {selected.history
                      .slice()
                      .reverse()
                      .map((h) => (
                        <li key={h.id}>
                          <strong>{h.byName}</strong> · {formatWhen(h.at)}
                          <span>{h.note || h.kind}</span>
                        </li>
                      ))}
                  </ol>
                </div>
              ) : null}
            </>
          )}
        </article>
      </div>

      {composerOpen ? (
        <AdminOverlayPortal>
          <AdminFormWizard
            open={composerOpen}
            onClose={() => setComposerOpen(false)}
            titleId="payroll-create"
            eyebrow="Paie"
            title="Nouveau bulletin de paie"
            lead="Salaire, primes, heures supp. — calcul CNPS & IRPP automatique"
            avatar="PA"
            steps={[
              { id: "bulletin", label: "Bulletin", hint: "Éléments" },
            ]}
            stepId="bulletin"
            onStepChange={() => undefined}
            canEnterStep={() => true}
            formId="payroll-form"
            onSubmit={(e) => void create(e)}
            submitLabel={busy ? "Calcul…" : "Créer le bulletin"}
            busy={busy}
            canSubmit={Boolean(
              draft.employeeName.trim() && n(draft.baseSalary) > 0,
            )}
          >
            <FwPanel>
              <FwPanelHead
                title="Collaborateur"
                description="Identité et rattachement site"
              />
              <FwGrid>
                <FwField label="Période *">
                  <input
                    type="month"
                    required
                    value={draft.period}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, period: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Nom complet *" wide>
                  <input
                    required
                    value={draft.employeeName}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        employeeName: e.target.value,
                      }))
                    }
                    placeholder="Ex. Marie Nguema"
                  />
                </FwField>
                <FwField label="E-mail">
                  <input
                    type="email"
                    value={draft.employeeEmail}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        employeeEmail: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Matricule">
                  <input
                    value={draft.matricule}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, matricule: e.target.value }))
                    }
                    placeholder="NECS-…"
                  />
                </FwField>
                <FwField label="Poste">
                  <input
                    value={draft.jobTitle}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, jobTitle: e.target.value }))
                    }
                    placeholder="Agent de nettoyage"
                  />
                </FwField>
                <FwField label="Site">
                  <input
                    value={draft.site}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, site: e.target.value }))
                    }
                    placeholder="Yaoundé / Douala"
                  />
                </FwField>
                <FwField label="N° CNPS">
                  <input
                    value={draft.cnpsNumber}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, cnpsNumber: e.target.value }))
                    }
                  />
                </FwField>
              </FwGrid>
            </FwPanel>

            <FwPanel>
              <FwPanelHead
                title="Éléments de salaire"
                description="Montants en FCFA (XAF)"
              />
              <FwGrid>
                <FwField label="Salaire de base *">
                  <input
                    inputMode="numeric"
                    required
                    value={draft.baseSalary}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, baseSalary: e.target.value }))
                    }
                    placeholder="150000"
                  />
                </FwField>
                <FwField label="Indemnité transport">
                  <input
                    inputMode="numeric"
                    value={draft.transportAllowance}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        transportAllowance: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Primes">
                  <input
                    inputMode="numeric"
                    value={draft.primes}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, primes: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Heures supplémentaires">
                  <input
                    inputMode="decimal"
                    value={draft.overtimeHours}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        overtimeHours: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Autres gains">
                  <input
                    inputMode="numeric"
                    value={draft.otherGains}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, otherGains: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Autres retenues">
                  <input
                    inputMode="numeric"
                    value={draft.otherDeductions}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        otherDeductions: e.target.value,
                      }))
                    }
                  />
                </FwField>
                <FwField label="Mode de paiement" wide>
                  <select
                    value={draft.paymentMethod}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        paymentMethod: e.target.value,
                      }))
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </FwField>
                <FwField label="Note" wide>
                  <textarea
                    rows={2}
                    value={draft.note}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, note: e.target.value }))
                    }
                  />
                </FwField>
              </FwGrid>
              <FwReview>
                <FwReviewCard
                  title="Aperçu calculé"
                  rows={[
                    { label: "Brut", value: formatXaf(preview.gross) },
                    {
                      label: "CNPS salarié",
                      value: formatXaf(preview.cnpsEmployee),
                    },
                    { label: "IRPP", value: formatXaf(preview.irpp) },
                    {
                      label: "Net à payer",
                      value: <strong>{formatXaf(preview.net)}</strong>,
                    },
                    {
                      label: "CNPS employeur (info)",
                      value: formatXaf(preview.cnpsEmployer),
                    },
                  ]}
                />
              </FwReview>
            </FwPanel>
          </AdminFormWizard>
        </AdminOverlayPortal>
      ) : null}

      <style jsx>{`
        .payroll-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
          gap: 0.65rem;
          margin: 0 0 1rem;
        }
        .payroll-kpis > div {
          background: rgba(10, 58, 114, 0.04);
          border: 1px solid rgba(10, 58, 114, 0.1);
          border-radius: 12px;
          padding: 0.7rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .payroll-kpis em {
          font-style: normal;
          font-size: 0.72rem;
          font-weight: 650;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted, #5b6b7c);
        }
        .payroll-kpis strong {
          font-size: 0.95rem;
          color: var(--blue-950, #031a36);
        }
        .payroll-lines {
          margin-top: 1.1rem;
        }
        .payroll-lines h4,
        .payroll-history h4 {
          margin: 0 0 0.55rem;
          font-size: 0.85rem;
          font-weight: 750;
          color: var(--blue-950, #031a36);
        }
        .payroll-lines ul {
          list-style: none;
          margin: 0;
          padding: 0;
          border: 1px solid rgba(10, 58, 114, 0.12);
          border-radius: 12px;
          overflow: hidden;
        }
        .payroll-lines li {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.55rem 0.8rem;
          font-size: 0.88rem;
          border-bottom: 1px solid rgba(10, 58, 114, 0.08);
        }
        .payroll-lines li:last-child {
          border-bottom: 0;
        }
        .payroll-lines li[data-kind="retenue"] strong {
          color: #b42318;
        }
        .payroll-lines li[data-kind="info"] {
          background: rgba(10, 58, 114, 0.03);
          font-weight: 650;
        }
        .payroll-history {
          margin-top: 1.25rem;
        }
        .payroll-history ol {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 0.45rem;
        }
        .payroll-history li {
          display: grid;
          gap: 0.1rem;
          font-size: 0.82rem;
          color: var(--muted, #5b6b7c);
        }
        .payroll-history li strong {
          color: var(--blue-950, #031a36);
        }
      `}</style>
    </RhWorkspaceShell>
  );
}
