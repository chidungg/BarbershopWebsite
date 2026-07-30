import AdminPageHeader from './AdminPageHeader';

const services = [
  { name: 'Signature Haircut', category: 'Haircut', duration: '45 min', price: '₫350.000', barbers: 12, bookings: 174, status: 'Active', code: 'SV-001' },
  { name: 'Haircut & Beard', category: 'Combo', duration: '70 min', price: '₫520.000', barbers: 9, bookings: 136, status: 'Active', code: 'SV-002' },
  { name: 'Classic Shave', category: 'Shaving', duration: '35 min', price: '₫280.000', barbers: 8, bookings: 91, status: 'Active', code: 'SV-003' },
  { name: 'Premium Grooming', category: 'Combo', duration: '95 min', price: '₫680.000', barbers: 6, bookings: 81, status: 'Active', code: 'SV-004' },
  { name: 'Hair Styling', category: 'Styling', duration: '40 min', price: '₫320.000', barbers: 11, bookings: 67, status: 'Active', code: 'SV-005' },
  { name: 'Hair Coloring', category: 'Color', duration: '120 min', price: '₫950.000', barbers: 4, bookings: 34, status: 'Inactive', code: 'SV-006' },
];

export default function ServicesPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="CATALOG MANAGEMENT"
        title="Services"
        description="Configure service information, pricing, duration, availability, and assigned barbers."
        actions={<button className="admin-primary-button" type="button">+ Add service</button>}
      />

      <section className="admin-module-metrics admin-module-metrics--four">
        {[
          ['Total services', '18', '16 active', 'gold'],
          ['Monthly bookings', '482', '+10.7%', 'green'],
          ['Most popular', 'Signature Haircut', '174 bookings', 'blue'],
          ['Average price', '₫438.000', '+3.2%', 'purple'],
        ].map(([label, value, change, tone]) => (
          <article className={`admin-module-metric is-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><em>{change}</em></article>
        ))}
      </section>

      <section className="admin-toolbar admin-toolbar--standalone">
        <div className="admin-toolbar__search"><input placeholder="Search services..." type="search" /></div>
        <div className="admin-toolbar__filters"><select defaultValue="All categories"><option>All categories</option><option>Haircut</option><option>Combo</option><option>Shaving</option><option>Styling</option><option>Color</option></select><select defaultValue="All statuses"><option>All statuses</option><option>Active</option><option>Inactive</option></select></div>
      </section>

      <section className="admin-service-card-grid">
        {services.map((service, index) => (
          <article className="admin-panel admin-service-card" key={service.code}>
            <div className={`admin-service-card__visual is-${index % 4}`}><span>{service.category}</span></div>
            <div className="admin-service-card__body">
              <div className="admin-service-card__heading"><div><small>{service.code}</small><h2>{service.name}</h2></div><span className={`admin-status-badge is-${service.status.toLowerCase()}`}>{service.status}</span></div>
              <p>Professional {service.name.toLowerCase()} service delivered by trained barbers.</p>
              <div className="admin-service-card__meta"><span><strong>{service.duration}</strong>Duration</span><span><strong>{service.price}</strong>Price</span><span><strong>{service.barbers}</strong>Barbers</span><span><strong>{service.bookings}</strong>Bookings</span></div>
              <div className="admin-card-actions"><button type="button">Edit service</button><button type="button">Assign barbers</button><button className="is-danger" type="button">Deactivate</button></div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}