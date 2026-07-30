import { useMemo, useState } from 'react';

import AdminPageHeader from './AdminPageHeader';

const appointments = [
  ['APT-1048', 'Ethan Nguyen', 'EN', 'Signature Haircut', 'Marcus Lee', '30 Jul 2026', '09:30', '₫350.000', 'Paid', 'Confirmed'],
  ['APT-1047', 'Lucas Tran', 'LT', 'Haircut & Beard', 'Daniel Pham', '30 Jul 2026', '10:15', '₫520.000', 'Paid', 'Completed'],
  ['APT-1046', 'Noah Le', 'NL', 'Classic Shave', 'Marcus Lee', '30 Jul 2026', '11:00', '₫280.000', 'Pending', 'Pending'],
  ['APT-1045', 'Liam Hoang', 'LH', 'Premium Grooming', 'James Vu', '30 Jul 2026', '13:45', '₫680.000', 'Paid', 'Confirmed'],
  ['APT-1044', 'Oliver Do', 'OD', 'Hair Styling', 'Daniel Pham', '30 Jul 2026', '15:30', '₫320.000', 'Refunded', 'Cancelled'],
  ['APT-1043', 'Mason Pham', 'MP', 'Haircut & Beard', 'Henry Nguyen', '31 Jul 2026', '08:45', '₫520.000', 'Paid', 'In Progress'],
] as const;

export default function AppointmentsPage() {
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [status, setStatus] = useState('All statuses');

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => status === 'All statuses' || appointment[9] === status);
  }, [status]);

  return (
    <>
      <AdminPageHeader
        eyebrow="BOOKING MANAGEMENT"
        title="Appointments"
        description="Review, confirm, reassign, reschedule, and complete customer bookings."
        actions={<button className="admin-primary-button" type="button">+ New appointment</button>}
      />

      <section className="admin-module-metrics admin-module-metrics--four">
        {[
          ['Today', '47', '12 remaining', 'gold'],
          ['Pending', '12', 'Needs action', 'orange'],
          ['Completed', '31', '66% today', 'green'],
          ['Cancelled', '4', '8.5% today', 'red'],
        ].map(([label, value, change, tone]) => (
          <article className={`admin-module-metric is-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><em>{change}</em></article>
        ))}
      </section>

      <section className="admin-panel admin-management-panel">
        <div className="admin-toolbar">
          <div className="admin-view-switcher">
            <button className={view === 'table' ? 'is-active' : undefined} type="button" onClick={() => setView('table')}>Table</button>
            <button className={view === 'calendar' ? 'is-active' : undefined} type="button" onClick={() => setView('calendar')}>Calendar</button>
          </div>
          <div className="admin-toolbar__filters">
            <input type="date" defaultValue="2026-07-30" />
            <select defaultValue="All barbers"><option>All barbers</option><option>Marcus Lee</option><option>Daniel Pham</option><option>James Vu</option></select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All statuses</option><option>Pending</option><option>Confirmed</option><option>In Progress</option><option>Completed</option><option>Cancelled</option>
            </select>
          </div>
        </div>

        {view === 'table' ? (
          <div className="admin-table-scroll">
            <table className="admin-table admin-module-table">
              <thead><tr><th>Customer</th><th>Service</th><th>Barber</th><th>Date & time</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredAppointments.map(([id, customer, initials, service, barber, date, time, amount, payment, appointmentStatus]) => (
                  <tr key={id}>
                    <td><div className="admin-customer-cell"><span>{initials}</span><div><strong>{customer}</strong><small>#{id}</small></div></div></td>
                    <td>{service}</td><td>{barber}</td>
                    <td><div className="admin-date-cell"><strong>{date}</strong><span>{time}</span></div></td>
                    <td className="admin-amount-cell">{amount}</td>
                    <td><span className={`admin-status-badge is-${payment.toLowerCase()}`}>{payment}</span></td>
                    <td><span className={`admin-status-badge is-${appointmentStatus.toLowerCase().replace(' ', '-')}`}>{appointmentStatus}</span></td>
                    <td><div className="admin-row-actions"><button type="button">View</button><button type="button">Edit</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-calendar-preview">
            <div className="admin-calendar-preview__header"><span>Time</span><strong>Marcus Lee</strong><strong>Daniel Pham</strong><strong>James Vu</strong><strong>Henry Nguyen</strong></div>
            {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((time, index) => (
              <div className="admin-calendar-preview__row" key={time}>
                <span>{time}</span>
                <div>{index === 0 && <b>Signature Haircut<small>Ethan Nguyen</small></b>}</div>
                <div>{index === 1 && <b>Haircut & Beard<small>Lucas Tran</small></b>}</div>
                <div>{index === 3 && <b>Premium Grooming<small>Liam Hoang</small></b>}</div>
                <div>{index === 5 && <b>Classic Shave<small>Noah Le</small></b>}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}