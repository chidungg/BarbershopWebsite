import { useState } from 'react';

import AdminPageHeader from './AdminPageHeader';

const barbers = ['Marcus Lee', 'Daniel Pham', 'James Vu', 'Henry Nguyen'];
const days = ['Mon 27', 'Tue 28', 'Wed 29', 'Thu 30', 'Fri 31', 'Sat 01', 'Sun 02'];

const schedule: Record<string, string[]> = {
  'Marcus Lee': ['09:00–18:00', '09:00–18:00', 'Day off', '09:00–18:00', '09:00–18:00', '10:00–20:00', '10:00–17:00'],
  'Daniel Pham': ['10:00–19:00', '10:00–19:00', '10:00–19:00', 'Day off', '10:00–19:00', '10:00–20:00', '10:00–17:00'],
  'James Vu': ['09:00–18:00', 'Day off', '09:00–18:00', '09:00–18:00', '09:00–18:00', '10:00–20:00', 'Leave'],
  'Henry Nguyen': ['Day off', '09:00–18:00', '09:00–18:00', '09:00–18:00', '09:00–18:00', '10:00–20:00', '10:00–17:00'],
};

export default function SchedulesPage() {
  const [week, setWeek] = useState('27 Jul – 02 Aug 2026');

  return (
    <>
      <AdminPageHeader
        eyebrow="WORKFORCE PLANNING"
        title="Barber schedules"
        description="Plan shifts, breaks, days off, leave, and blocked appointment periods."
        actions={<button className="admin-primary-button" type="button">+ Create schedule</button>}
      />

      <section className="admin-module-metrics admin-module-metrics--four">
        {[
          ['Scheduled today', '16', 'of 18 active', 'gold'],
          ['On duty now', '12', '4 on break', 'green'],
          ['Leave requests', '3', 'Needs review', 'orange'],
          ['Schedule conflicts', '2', 'Needs action', 'red'],
        ].map(([label, value, change, tone]) => <article className={`admin-module-metric is-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><em>{change}</em></article>)}
      </section>

      <section className="admin-panel admin-schedule-panel">
        <div className="admin-toolbar">
          <div className="admin-schedule-navigation"><button type="button">←</button><strong>{week}</strong><button type="button">→</button><button type="button" onClick={() => setWeek('27 Jul – 02 Aug 2026')}>Today</button></div>
          <div className="admin-toolbar__filters"><select defaultValue="All barbers"><option>All barbers</option>{barbers.map((barber) => <option key={barber}>{barber}</option>)}</select><button className="admin-secondary-button" type="button">Copy previous week</button></div>
        </div>

        <div className="admin-schedule-grid">
          <div className="admin-schedule-grid__head"><span>Barber</span>{days.map((day) => <strong key={day}>{day}</strong>)}</div>
          {barbers.map((barber, barberIndex) => (
            <div className="admin-schedule-grid__row" key={barber}>
              <div className="admin-schedule-barber"><span>{barber.split(' ').map((part) => part[0]).join('')}</span><div><strong>{barber}</strong><small>{barberIndex === 0 ? 'Master Barber' : 'Senior Barber'}</small></div></div>
              {schedule[barber].map((slot, index) => (
                <button className={slot === 'Day off' ? 'is-off' : slot === 'Leave' ? 'is-leave' : undefined} key={`${barber}-${days[index]}`} type="button"><strong>{slot}</strong>{slot.includes('–') && <small>1h break</small>}</button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-module-grid admin-module-grid--equal">
        <article className="admin-panel admin-module-panel"><header className="admin-panel__header"><div><p>PENDING REQUESTS</p><h2>Leave requests</h2></div></header><div className="admin-request-list">{[['James Vu', '02 Aug 2026', 'Personal leave'], ['Ryan Do', '05–06 Aug 2026', 'Annual leave'], ['Daniel Pham', '10 Aug 2026', 'Medical appointment']].map(([name, date, reason]) => <div key={name + date}><div><strong>{name}</strong><span>{date} · {reason}</span></div><div><button type="button">Approve</button><button className="is-danger" type="button">Reject</button></div></div>)}</div></article>
        <article className="admin-panel admin-module-panel"><header className="admin-panel__header"><div><p>OPERATING HOURS</p><h2>Shop schedule</h2></div></header><div className="admin-opening-hours">{[['Monday – Friday', '09:00 – 19:00'], ['Saturday', '10:00 – 20:00'], ['Sunday', '10:00 – 17:00'], ['Public holidays', 'Custom schedule']].map(([day, time]) => <div key={day}><span>{day}</span><strong>{time}</strong></div>)}</div></article>
      </section>
    </>
  );
}