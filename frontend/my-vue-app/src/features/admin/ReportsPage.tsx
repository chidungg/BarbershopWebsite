import AdminIcon from './AdminIcon';
import AdminPageHeader from './AdminPageHeader';

const reportCards = [
  ['Revenue report', 'Financial performance, refunds, net revenue, and payment methods.', 'revenue', 'Updated 5 minutes ago'],
  ['Appointment report', 'Booking volume, completion, cancellations, and no-show analysis.', 'appointments', 'Updated 8 minutes ago'],
  ['Barber performance', 'Revenue, bookings, rating, utilization, and service contribution.', 'barbers', 'Updated 10 minutes ago'],
  ['Customer growth', 'New customers, returning users, retention, and spending segments.', 'customers', 'Updated 15 minutes ago'],
  ['Service popularity', 'Demand, revenue, capacity, and performance for each service.', 'services', 'Updated 18 minutes ago'],
  ['Payment performance', 'Success rate, failures, refunds, and payment method distribution.', 'payments', 'Updated 20 minutes ago'],
] as const;

export default function ReportsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="BUSINESS INTELLIGENCE"
        title="Reports"
        description="Generate operational and financial reports for business analysis."
        actions={<button className="admin-primary-button" type="button">Create custom report</button>}
      />

      <section className="admin-report-card-grid">
        {reportCards.map(([title, description, icon, updated]) => (
          <article className="admin-panel admin-report-card" key={title}>
            <div className="admin-report-card__icon"><AdminIcon name={icon} size={24} /></div>
            <h2>{title}</h2><p>{description}</p><span>{updated}</span>
            <div className="admin-card-actions"><button type="button">View report</button><button type="button">Export PDF</button><button type="button">Export Excel</button></div>
          </article>
        ))}
      </section>

      <section className="admin-module-grid admin-module-grid--reports">
        <article className="admin-panel admin-module-panel">
          <header className="admin-panel__header"><div><p>KEY PERFORMANCE INDICATORS</p><h2>Business health</h2></div><select className="admin-inline-select" defaultValue="This month"><option>This month</option><option>This quarter</option><option>This year</option></select></header>
          <div className="admin-kpi-list">
            {[
              ['Revenue growth', '+12.5%', 82, 'Above target'],
              ['Customer retention', '68.4%', 68, 'Healthy'],
              ['Appointment completion', '91.7%', 92, 'Excellent'],
              ['Payment success rate', '96.8%', 97, 'Excellent'],
              ['Barber utilization', '82.0%', 82, 'Healthy'],
              ['Cancellation rate', '4.0%', 28, 'Below limit'],
            ].map(([label, value, width, note]) => (
              <div className="admin-kpi-row" key={label as string}><div><strong>{label}</strong><span>{note}</span></div><span><i style={{ width: `${width}%` }} /></span><strong>{value}</strong></div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-module-panel">
          <header className="admin-panel__header"><div><p>SCHEDULED DELIVERY</p><h2>Automated reports</h2></div></header>
          <div className="admin-automation-list">
            {[
              ['Weekly operating summary', 'Every Monday · 08:00', 'admin@gentlemans.vn', 'Active'],
              ['Monthly revenue statement', 'First day of month · 09:00', 'finance@gentlemans.vn', 'Active'],
              ['Barber performance review', 'Last Friday · 17:00', 'manager@gentlemans.vn', 'Paused'],
            ].map(([title, schedule, recipient, status]) => (
              <div key={title}><div><strong>{title}</strong><span>{schedule}</span><small>{recipient}</small></div><span className={`admin-status-badge is-${status.toLowerCase()}`}>{status}</span><button type="button">Edit</button></div>
            ))}
          </div>
          <button className="admin-secondary-button admin-full-width-button" type="button">+ Schedule report</button>
        </article>
      </section>
    </>
  );
}