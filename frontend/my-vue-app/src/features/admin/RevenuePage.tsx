import { useState } from 'react';

import AdminIcon from './AdminIcon';
import AdminPageHeader from './AdminPageHeader';

const monthlyRevenue = [54, 64, 59, 72, 76, 83, 78, 92, 88, 96, 93, 100];

const revenueSources = [
  ['Signature Haircut', '₫38.450.000', '29.9%', 92],
  ['Haircut & Beard', '₫31.720.000', '24.7%', 76],
  ['Premium Grooming', '₫24.980.000', '19.4%', 60],
  ['Classic Shave', '₫18.600.000', '14.5%', 45],
  ['Other services', '₫14.700.000', '11.5%', 35],
];

const barberRevenue = [
  ['Marcus Lee', 'ML', '186', '₫38.200.000', '+14.2%'],
  ['Daniel Pham', 'DP', '164', '₫32.700.000', '+11.7%'],
  ['James Vu', 'JV', '142', '₫27.900.000', '+9.8%'],
  ['Henry Nguyen', 'HN', '118', '₫19.650.000', '+6.3%'],
];

export default function RevenuePage() {
  const [period, setPeriod] = useState('This month');

  return (
    <>
      <AdminPageHeader
        eyebrow="FINANCIAL MANAGEMENT"
        title="Revenue analytics"
        description="Track gross revenue, refunds, payment fees, and net business performance."
        actions={
          <>
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
            <button className="admin-primary-button" type="button">Export report</button>
          </>
        }
      />

      <section className="admin-module-metrics admin-module-metrics--four">
        {[
          ['Gross revenue', '₫128.450.000', '+12.5%', 'gold'],
          ['Net revenue', '₫119.860.000', '+11.8%', 'green'],
          ['Refunded', '₫3.240.000', '-2.1%', 'red'],
          ['Average order', '₫413.000', '+4.6%', 'blue'],
        ].map(([label, value, change, tone]) => (
          <article className={`admin-module-metric is-${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em>{change} from previous period</em>
          </article>
        ))}
      </section>

      <section className="admin-module-grid admin-module-grid--revenue">
        <article className="admin-panel admin-module-panel">
          <header className="admin-panel__header">
            <div>
              <p>REVENUE TREND</p>
              <h2>Monthly performance</h2>
            </div>
            <div className="admin-chart-legend">
              <span><i className="is-current" />Current year</span>
              <span><i className="is-previous" />Previous year</span>
            </div>
          </header>

          <div className="admin-bar-chart" aria-label="Revenue by month">
            {monthlyRevenue.map((height, index) => (
              <div className="admin-bar-chart__column" key={index}>
                <div className="admin-bar-chart__bars">
                  <i style={{ height: `${Math.max(20, height - 18)}%` }} />
                  <b style={{ height: `${height}%` }} />
                </div>
                <span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-module-panel">
          <header className="admin-panel__header">
            <div>
              <p>PAYMENT MIX</p>
              <h2>By payment method</h2>
            </div>
          </header>

          <div className="admin-payment-donut">
            <div><strong>₫128.4M</strong><span>Total</span></div>
          </div>

          <div className="admin-breakdown-list">
            <div><span><i className="is-gold" />Bank transfer</span><strong>42%</strong></div>
            <div><span><i className="is-green" />QR payment</span><strong>31%</strong></div>
            <div><span><i className="is-blue" />Cash</span><strong>19%</strong></div>
            <div><span><i className="is-purple" />Card</span><strong>8%</strong></div>
          </div>
        </article>
      </section>

      <section className="admin-module-grid admin-module-grid--equal">
        <article className="admin-panel admin-module-panel">
          <header className="admin-panel__header">
            <div><p>SERVICE CONTRIBUTION</p><h2>Revenue by service</h2></div>
          </header>
          <div className="admin-ranked-list">
            {revenueSources.map(([name, amount, share, width], index) => (
              <div className="admin-ranked-list__item" key={name}>
                <span className="admin-ranked-list__number">0{index + 1}</span>
                <div>
                  <strong>{name}</strong>
                  <span><i style={{ width: `${width}%` }} /></span>
                </div>
                <div><strong>{amount}</strong><em>{share}</em></div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-table-panel">
          <header className="admin-panel__header admin-panel__header--table">
            <div><p>BARBER PERFORMANCE</p><h2>Revenue leaderboard</h2></div>
          </header>
          <div className="admin-table-scroll">
            <table className="admin-table admin-module-table">
              <thead><tr><th>Barber</th><th>Bookings</th><th>Revenue</th><th>Growth</th></tr></thead>
              <tbody>
                {barberRevenue.map(([name, initials, bookings, revenue, growth]) => (
                  <tr key={name}>
                    <td><div className="admin-customer-cell"><span>{initials}</span><div><strong>{name}</strong><small>Active barber</small></div></div></td>
                    <td>{bookings}</td>
                    <td className="admin-amount-cell">{revenue}</td>
                    <td><span className="admin-positive-text">{growth}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}