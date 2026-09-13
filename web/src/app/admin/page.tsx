import {
  IconArrow,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconClose,
  IconMore,
  IconQuality,
  IconSearch,
  IconUser,
} from "@/components/admin/Icons";

const missions = [
  {
    site: "Immeuble Horizon",
    type: "Entretien quotidien",
    status: "Confirmé",
    date: "10 sep.",
    time: "06:00",
    tone: "ok" as const,
  },
  {
    site: "Usine Bassa",
    type: "Nettoyage atelier",
    status: "Confirmé",
    date: "10 sep.",
    time: "14:00",
    tone: "ok" as const,
  },
  {
    site: "Mall Riviera",
    type: "Vitrerie + sols",
    status: "Anomalie",
    date: "10 sep.",
    time: "22:00",
    tone: "danger" as const,
  },
  {
    site: "Banque Centrale",
    type: "Contrôle qualité",
    status: "Planifié",
    date: "11 sep.",
    time: "09:30",
    tone: "info" as const,
  },
  {
    site: "Clinique Palmiers",
    type: "Désinfection zones",
    status: "Confirmé",
    date: "11 sep.",
    time: "07:00",
    tone: "ok" as const,
  },
];

const requests = [
  { name: "Société Horizon SA", kind: "Demande de devis", when: "Aujourd’hui, 09:12" },
  { name: "Boutique Klaris", kind: "Lead Facebook", when: "Aujourd’hui, 08:40" },
  { name: "LogiTrans Cameroun", kind: "Visite technique", when: "Hier, 17:20" },
  { name: "Groupe Atlas", kind: "Avenant contrat", when: "Hier, 15:05" },
];

const dates = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

export default function AdminDashboardPage() {
  return (
    <div className="symp-dash">
      <header className="symp-hero">
        <div className="symp-hero__text">
          <p className="symp-hero__eyebrow">Pilotage NECS · Septembre 2026</p>
          <h1>Bon retour, Direction</h1>
          <p className="symp-hero__sub">
            Vue synthétique des prestations, de la qualité et des demandes entrantes.
          </p>
        </div>
        <div className="symp-hero__tools">
          <label className="symp-search">
            <IconSearch size={16} />
            <input placeholder="Rechercher un site, client…" />
          </label>
          <div className="symp-hero__btns">
            <button type="button" className="symp-btn symp-btn--ghost">
              Mensuel
            </button>
            <button type="button" className="symp-btn symp-btn--primary">
              Exporter
            </button>
          </div>
        </div>
      </header>

      <section className="symp-kpis" aria-label="Indicateurs clés">
        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#1260a8" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconClipboard size={18} />
            </span>
            <span className="symp-kpi__hint">Ce mois</span>
          </div>
          <h3>Prestations phares</h3>
          <div className="symp-kpi__value">
            <strong>580</strong>
            <em className="up">+24</em>
          </div>
          <div className="symp-bubbles" aria-hidden>
            <span className="b b1" />
            <span className="b b2" />
            <span className="b b3" />
            <span className="b b4" />
          </div>
          <ul className="symp-legend">
            <li><i className="dot d1" />Bureaux</li>
            <li><i className="dot d2" />Industrie</li>
            <li><i className="dot d3" />Commerce</li>
            <li><i className="dot d4" />Santé</li>
          </ul>
        </article>

        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#4faf2a" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconQuality size={18} />
            </span>
            <span className="symp-kpi__hint">Clients actifs</span>
          </div>
          <h3>Taux de satisfaction</h3>
          <div className="symp-kpi__value">
            <strong>91%</strong>
            <em className="down">-2%</em>
          </div>
          <div className="symp-gauge" aria-hidden>
            <div className="symp-gauge__arc" />
            <div className="symp-gauge__needle" />
            <span>91</span>
          </div>
        </article>

        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#1570b8" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconUser size={18} />
            </span>
            <span className="symp-kpi__hint">Agents & chefs</span>
          </div>
          <h3>Effectif terrain</h3>
          <div className="symp-kpi__value">
            <strong>214</strong>
            <em className="up">+12</em>
          </div>
          <div className="symp-stackbar" aria-hidden>
            <span style={{ flex: 148 }} />
            <span style={{ flex: 42 }} />
            <span style={{ flex: 24 }} />
          </div>
          <ul className="symp-legend">
            <li><i className="dot d1" />Agents 148</li>
            <li><i className="dot d2" />Chefs 42</li>
            <li><i className="dot d3" />Recrut. 24</li>
          </ul>
        </article>

        <article className="symp-kpi" style={{ ["--kpi-c" as string]: "#1f6b28" }}>
          <div className="symp-kpi__top">
            <span className="symp-kpi__icon">
              <IconCalendar size={18} />
            </span>
            <span className="symp-kpi__hint">Planifiées</span>
          </div>
          <h3>Missions du mois</h3>
          <div className="symp-kpi__value">
            <strong>260</strong>
            <em className="up">+16</em>
          </div>
          <div className="symp-bars" aria-hidden>
            {[40, 55, 35, 70, 48, 82, 60, 45, 75, 50, 68, 58].map((h, i) => (
              <span key={i} className={i === 5 ? "is-hot" : undefined} style={{ height: `${h}%` }}>
                {i === 5 ? <b>18</b> : null}
              </span>
            ))}
          </div>
        </article>
      </section>

      <div className="symp-grid">
        <section className="symp-panel symp-panel--missions">
          <header className="symp-panel__head">
            <div>
              <h2>Missions à venir</h2>
              <p>Planning terrain · semaine du 14 au 30</p>
            </div>
            <button type="button" className="symp-link">
              Voir tout
            </button>
          </header>

          <div className="symp-dates">
            <div className="symp-dates__legend">
              <span><i className="dot d2" />Disponible</span>
              <span><i className="dot d1" />Sélectionné</span>
              <span><i className="dot d4" />Indisponible</span>
            </div>
            <div className="symp-dates__row">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`symp-date${d === 22 ? " is-selected" : ""}${d === 19 || d === 26 ? " is-off" : ""}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="symp-table-wrap">
            <table className="symp-table">
              <thead>
                <tr>
                  <th>Site / Client</th>
                  <th>Prestation</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={`${m.site}-${m.time}`}>
                    <td>
                      <div className="symp-person">
                        <span className="dash-avatar sm">{m.site.slice(0, 1)}</span>
                        <strong>{m.site}</strong>
                      </div>
                    </td>
                    <td className="symp-muted">{m.type}</td>
                    <td>
                      <span className={`symp-status tone-${m.tone}`}>
                        <i />
                        {m.status}
                      </span>
                    </td>
                    <td>{m.date}</td>
                    <td className="symp-time">{m.time}</td>
                    <td>
                      <div className="symp-row-actions">
                        <button type="button" className="symp-round" aria-label="Ouvrir">
                          <IconArrow size={16} />
                        </button>
                        <button type="button" className="symp-more" aria-label="Plus">
                          <IconMore size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="symp-missions-mobile" aria-label="Missions">
              {missions.map((m) => (
                <article key={`m-${m.site}-${m.time}`} className="symp-mission-card">
                  <div className="symp-mission-card__top">
                    <div className="symp-person">
                      <span className="dash-avatar sm">{m.site.slice(0, 1)}</span>
                      <div>
                        <strong>{m.site}</strong>
                        <span>{m.type}</span>
                      </div>
                    </div>
                    <div className="symp-row-actions">
                      <button type="button" className="symp-round" aria-label="Ouvrir">
                        <IconArrow size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="symp-mission-card__meta">
                    <span className={`symp-status tone-${m.tone}`}>
                      <i />
                      {m.status}
                    </span>
                    <span>{m.date}</span>
                    <span>{m.time}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="symp-panel symp-panel--requests">
          <header className="symp-panel__head">
            <div>
              <h2>Demandes</h2>
              <p>4 nouvelles à traiter</p>
            </div>
            <button type="button" className="symp-link">
              Voir tout
            </button>
          </header>
          <ul className="symp-requests">
            {requests.map((r) => (
              <li key={r.name}>
                <div className="symp-person">
                  <span className="dash-avatar sm">{r.name.slice(0, 1)}</span>
                  <div>
                    <strong>{r.name}</strong>
                    <span>{r.kind}</span>
                    <small>{r.when}</small>
                  </div>
                </div>
                <div className="symp-req-actions">
                  <button type="button" className="symp-round ghost" aria-label="Refuser">
                    <IconClose size={14} />
                  </button>
                  <button type="button" className="symp-round" aria-label="Accepter">
                    <IconCheck size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
