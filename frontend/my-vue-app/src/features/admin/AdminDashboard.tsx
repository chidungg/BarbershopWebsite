import { useState } from 'react';
import { Link } from 'react-router-dom';

import AdminIcon, { type AdminIconName } from './AdminIcon';

type StatCard = {
  title: string;
  value: string;
  change: string;
  comparison: string;
  direction: 'up' | 'down';
  icon: AdminIconName;
  tone: 'gold' | 'green' | 'blue' | 'purple';
};

type AppointmentStatus = 'Confirmed' | 'Completed' | 'Pending' | 'Cancelled';

type Appointment = {
  id: string;
  customer: string;
  initials: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  amount: string;
  status: AppointmentStatus;
};

const statCards: StatCard[] = [
  {
    title: 'Total revenue',
    value: '₫128.450.000',
    change: '12.5%',
    comparison: 'vs. last month',
    direction: 'up',
    icon: 'revenue',
    tone: 'gold',
  },
  {
    title: 'Total users',
    value: '2,846',
    change: '8.2%',
    comparison: 'vs. last month',
    direction: 'up',
    icon: 'customers',
    tone: 'blue',
  },
  {
    title: 'Active barbers',
    value: '18',
    change: '2 new',
    comparison: 'this month',
    direction: 'up',
    icon: 'barbers',
    tone: 'purple',
  },
  {
    title: 'Appointments today',
    value: '47',
    change: '4.1%',
    comparison: 'vs. yesterday',
    direction: 'down',
    icon: 'appointments',
    tone: 'green',
  },
];

const appointments: Appointment[] = [
  {
    id: '#APT-1048',
    customer: 'Ethan Nguyen',
    initials: 'EN',
    service: 'Signature Haircut',
    barber: 'Marcus Lee',
    date: '30 Jul 2026',
    time: '09:30',
    amount: '₫350.000',
    status: 'Confirmed',
  },
  {
    id: '#APT-1047',
    customer: 'Lucas Tran',
    initials: 'LT',
    service: 'Haircut & Beard',
    barber: 'Daniel Pham',
    date: '30 Jul 2026',
    time: '10:15',
    amount: '₫520.000',
    status: 'Completed',
  },
  {
    id: '#APT-1046',
    customer: 'Noah Le',
    initials: 'NL',
    service: 'Classic Shave',
    barber: 'Marcus Lee',
    date: '30 Jul 2026',
    time: '11:00',
    amount: '₫280.000',
    status: 'Pending',
  },
  {
    id: '#APT-1045',
    customer: 'Liam Hoang',
    initials: 'LH',
    service: 'Premium Grooming',
    barber: 'James Vu',
    date: '30 Jul 2026',
    time: '13:45',
    amount: '₫680.000',
    status: 'Confirmed',
  },
];

const topBarbers = [
  ['Marcus Lee', 'ML', 'Master Barber', '4.9', '186 bookings', '₫38.2M'],
  ['Daniel Pham', 'DP', 'Senior Barber', '4.8', '164 bookings', '₫32.7M'],
  ['James Vu', 'JV', 'Style Specialist', '4.8', '142 bookings', '₫27.9M'],
];

export default function AdminDashboard() {
  const [period, setPeriod] = useState('This month');

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p>OVERVIEW</p>
          <h1>Good afternoon, Alex.</h1>
          <span>Here is what is happening at your barbershop today.</span>
        </div>

        <div className="admin-heading-actions">
          <label className="admin-period-select">
            <AdminIcon name="calendar" size={18} />
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option>This week</option>
              <option>This month</option>
              <option>This quarter</option>
              <option>This year</option>
            </select>
            <AdminIcon name="chevronDown" size={15} />
          </label>
          <Link className="admin-primary-button admin-button-link" to="/administrator/reports">
            Download report
          </Link>
        </div>
      </section>

      <section className="admin-stat-grid" aria-label="Business overview">
        {statCards.map((card) => (
          <article className="admin-stat-card" key={card.title}>
            <div className={`admin-stat-card__icon is-${card.tone}`}>
              <AdminIcon name={card.icon} />
            </div>
            <div className="admin-stat-card__menu">
              <AdminIcon name="more" size={19} />
            </div>
            <p>{card.title}</p>
            <strong>{card.value}</strong>
            <div className={`admin-stat-card__trend is-${card.direction}`}>
              <span>
                <AdminIcon
                  name={card.direction === 'up' ? 'trendUp' : 'trendDown'}
                  size={14}
                />
                {card.change}
              </span>
              {card.comparison}
            </div>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel admin-revenue-panel">
          <header className="admin-panel__header">
            <div>
              <p>REVENUE ANALYTICS</p>
              <h2>Revenue performance</h2>
            </div>
            <Link className="admin-text-button" to="/administrator/revenue">
              View details
            </Link>
          </header>

          <div className="admin-revenue-summary">
            <strong>₫128.450.000</strong>
            <span>
              <AdminIcon name="trendUp" size={14} />12.5%
            </span>
          </div>

          <div className="admin-chart" aria-label="Hardcoded monthly revenue chart">
            <div className="admin-chart__axis">
              <span>40M</span>
              <span>30M</span>
              <span>20M</span>
              <span>10M</span>
              <span>0</span>
            </div>
            <div className="admin-chart__plot">
              <div className="admin-chart__gridlines" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
              <svg
                aria-hidden="true"
                className="admin-chart__line"
                preserveAspectRatio="none"
                viewBox="0 0 1100 260"
              >
                <defs>
                  <linearGradient id="dashboardRevenueArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#bb8c51" stopOpacity="0.27" />
                    <stop offset="100%" stopColor="#bb8c51" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="admin-chart__previous-line"
                  d="M0 220 C90 200 125 210 190 180 S310 198 380 150 S510 162 570 124 S695 142 760 102 S880 120 950 72 S1040 84 1100 48"
                />
                <path
                  className="admin-chart__area"
                  style={{ fill: 'url(#dashboardRevenueArea)' }}
                  d="M0 208 C80 190 120 200 190 164 S300 184 380 132 S500 155 570 108 S680 132 760 76 S870 100 950 44 S1040 58 1100 20 L1100 260 L0 260Z"
                />
                <path
                  className="admin-chart__current-line"
                  d="M0 208 C80 190 120 200 190 164 S300 184 380 132 S500 155 570 108 S680 132 760 76 S870 100 950 44 S1040 58 1100 20"
                />
              </svg>
              <div className="admin-chart__months">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                  (month) => <span key={month}>{month}</span>,
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="admin-panel admin-appointments-summary">
          <header className="admin-panel__header">
            <div>
              <p>APPOINTMENT STATUS</p>
              <h2>This month</h2>
            </div>
            <Link className="admin-text-button" to="/administrator/appointments">
              View all
            </Link>
          </header>

          <div className="admin-donut-wrap">
            <div className="admin-donut">
              <div>
                <strong>482</strong>
                <span>Total bookings</span>
              </div>
            </div>
          </div>

          <div className="admin-status-list">
            <div><span><i className="is-completed" />Completed</span><strong>318</strong><em>66%</em></div>
            <div><span><i className="is-confirmed" />Confirmed</span><strong>106</strong><em>22%</em></div>
            <div><span><i className="is-pending" />Pending</span><strong>39</strong><em>8%</em></div>
            <div><span><i className="is-cancelled" />Cancelled</span><strong>19</strong><em>4%</em></div>
          </div>
        </article>
      </section>

      <section className="admin-lower-grid">
        <article className="admin-panel admin-table-panel">
          <header className="admin-panel__header admin-panel__header--table">
            <div>
              <p>RECENT ACTIVITY</p>
              <h2>Today&apos;s appointments</h2>
            </div>
            <Link className="admin-text-button" to="/administrator/appointments">
              View all appointments <span>→</span>
            </Link>
          </header>

          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Barber</th>
                  <th>Date & time</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <div className="admin-customer-cell">
                        <span>{appointment.initials}</span>
                        <div>
                          <strong>{appointment.customer}</strong>
                          <small>{appointment.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{appointment.service}</td>
                    <td>{appointment.barber}</td>
                    <td>
                      <div className="admin-date-cell">
                        <strong>{appointment.date}</strong>
                        <span>{appointment.time}</span>
                      </div>
                    </td>
                    <td className="admin-amount-cell">{appointment.amount}</td>
                    <td>
                      <span className={`admin-status-badge is-${appointment.status.toLowerCase()}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel admin-barber-panel">
          <header className="admin-panel__header">
            <div>
              <p>PERFORMANCE</p>
              <h2>Top barbers</h2>
            </div>
            <Link className="admin-text-button" to="/administrator/barbers">
              View all
            </Link>
          </header>

          <div className="admin-barber-list">
            {topBarbers.map(([name, initials, specialty, rating, bookings, revenue], index) => (
              <div className="admin-barber-row" key={name}>
                <span className="admin-barber-rank">0{index + 1}</span>
                <span className="admin-barber-avatar">{initials}</span>
                <div className="admin-barber-copy">
                  <strong>{name}</strong>
                  <span>{specialty}</span>
                </div>
                <div className="admin-barber-rating">
                  <AdminIcon name="star" size={14} />
                  <strong>{rating}</strong>
                  <span>{bookings}</span>
                </div>
                <strong className="admin-barber-revenue">{revenue}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-quick-insights">
        <article>
          <div className="admin-quick-insights__icon"><AdminIcon name="payments" /></div>
          <div><span>Successful payments</span><strong>₫119.860.000</strong></div>
          <em>96.8%</em>
        </article>
        <article>
          <div className="admin-quick-insights__icon"><AdminIcon name="customers" /></div>
          <div><span>New customers</span><strong>184</strong></div>
          <em>+18.3%</em>
        </article>
        <article>
          <div className="admin-quick-insights__icon"><AdminIcon name="star" /></div>
          <div><span>Average rating</span><strong>4.8 / 5</strong></div>
          <em>1,264 reviews</em>
        </article>
        <article>
          <div className="admin-quick-insights__icon"><AdminIcon name="services" /></div>
          <div><span>Service capacity</span><strong>82%</strong></div>
          <em>Healthy</em>
        </article>
      </section>
    </>
  );
}