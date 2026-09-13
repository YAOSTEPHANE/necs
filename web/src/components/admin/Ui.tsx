import type { StatusTone } from "@/lib/mock-data";

export function PageHeader({
  code,
  title,
  description,
  actions,
}: {
  code: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p className="page-header__code">{code}</p>
        <h2>{title}</h2>
        <p className="page-header__desc">{description}</p>
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}

export function KpiGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    delta?: string;
    tone?: StatusTone;
    source?: string;
  }>;
}) {
  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <article
          key={item.label}
          className={`kpi-card tone-${item.tone ?? "neutral"}`}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.delta ? <em>{item.delta}</em> : null}
          {item.source ? <small>{item.source}</small> : null}
        </article>
      ))}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel-card">
      <div className="panel-card__head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="btn-admin btn-admin--primary">
      {children}
    </button>
  );
}

export function GhostButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="button" className="btn-admin btn-admin--ghost">
      {children}
    </button>
  );
}
