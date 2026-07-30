import AdminIcon from './AdminIcon';
import AdminPageHeader from './AdminPageHeader';

const barbers = [
  { name: 'Marcus Lee', initials: 'ML', role: 'Master Barber', specialties: ['Fade', 'Beard', 'Classic'], rating: '4.9', bookings: 186, revenue: '₫38.2M', availability: 'Available', status: 'Active' },
  { name: 'Daniel Pham', initials: 'DP', role: 'Senior Barber', specialties: ['Texture', 'Styling'], rating: '4.8', bookings: 164, revenue: '₫32.7M', availability: 'In service', status: 'Active' },
  { name: 'James Vu', initials: 'JV', role: 'Style Specialist', specialties: ['Perm', 'Color'], rating: '4.8', bookings: 142, revenue: '₫27.9M', availability: 'Available', status: 'Active' },
  { name: 'Henry Nguyen', initials: 'HN', role: 'Barber', specialties: ['Haircut', 'Shave'], rating: '4.7', bookings: 118, revenue: '₫19.6M', availability: 'Day off', status: 'Active' },
  { name: 'Ryan Do', initials: 'RD', role: 'Junior Barber', specialties: ['Haircut'], rating: '4.5', bookings: 72, revenue: '₫11.4M', availability: 'Unavailable', status: 'Inactive' },
  { name: 'William Tran', initials: 'WT', role: 'Senior Barber', specialties: ['Beard', 'Grooming'], rating: '4.7', bookings: 131, revenue: '₫22.1M', availability: 'Available', status: 'Active' },
];

export default function BarbersPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="TEAM MANAGEMENT"
        title="Barbers"
        description="Manage barber profiles, assigned services, schedules, and performance."
        actions={<button className="admin-primary-button" type="button">+ Add barber</button>}
      />

      <section className="admin-module-metrics admin-module-metrics--four">
        {[
          ['Total barbers', '20', '18 active', 'gold'],
          ['Available today', '14', '77.8%', 'green'],
          ['Average rating', '4.8', '1,264 reviews', 'blue'],
          ['Monthly bookings', '741', '+9.4%', 'purple'],
        ].map(([label, value, change, tone]) => (
          <article className={`admin-module-metric is-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><em>{change}</em></article>
        ))}
      </section>

      <section className="admin-toolbar admin-toolbar--standalone">
        <div className="admin-toolbar__search"><input placeholder="Search barbers..." type="search" /></div>
        <div className="admin-toolbar__filters">
          <select defaultValue="All statuses"><option>All statuses</option><option>Active</option><option>Inactive</option></select>
          <select defaultValue="All specialties"><option>All specialties</option><option>Haircut</option><option>Beard</option><option>Color</option><option>Perm</option></select>
          <button className="admin-secondary-button" type="button">Manage schedules</button>
        </div>
      </section>

      <section className="admin-barber-card-grid">
        {barbers.map((barber) => (
          <article className="admin-panel admin-barber-card" key={barber.name}>
            <div className="admin-barber-card__top">
              <span className="admin-barber-card__avatar">{barber.initials}</span>
              <span className={`admin-status-badge is-${barber.status.toLowerCase()}`}>{barber.status}</span>
            </div>
            <h2>{barber.name}</h2>
            <p>{barber.role}</p>
            <div className="admin-specialty-list">{barber.specialties.map((item) => <span key={item}>{item}</span>)}</div>
            <div className="admin-barber-card__stats">
              <div><AdminIcon name="star" size={15} /><strong>{barber.rating}</strong><span>Rating</span></div>
              <div><strong>{barber.bookings}</strong><span>Bookings</span></div>
              <div><strong>{barber.revenue}</strong><span>Revenue</span></div>
            </div>
            <div className="admin-barber-card__availability"><span>Current status</span><strong>{barber.availability}</strong></div>
            <div className="admin-card-actions"><button type="button">View profile</button><button type="button">Edit</button><button type="button">Schedule</button></div>
          </article>
        ))}
      </section>
    </>
  );
}