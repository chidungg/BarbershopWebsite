import { useMemo, useState } from 'react';

import AdminPageHeader from './AdminPageHeader';

type UserStatus = 'Active' | 'Inactive' | 'Blocked';

type UserRow = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  appointments: number;
  spending: string;
  joined: string;
  status: UserStatus;
};

const users: UserRow[] = [
  { id: 'USR-2846', name: 'Ethan Nguyen', initials: 'EN', email: 'ethan.nguyen@gmail.com', phone: '090 123 4567', appointments: 18, spending: '₫7.860.000', joined: '12 Jan 2026', status: 'Active' },
  { id: 'USR-2845', name: 'Lucas Tran', initials: 'LT', email: 'lucas.tran@gmail.com', phone: '091 775 4421', appointments: 11, spending: '₫4.520.000', joined: '03 Feb 2026', status: 'Active' },
  { id: 'USR-2844', name: 'Noah Le', initials: 'NL', email: 'noah.le@gmail.com', phone: '098 660 1134', appointments: 7, spending: '₫2.940.000', joined: '16 Mar 2026', status: 'Inactive' },
  { id: 'USR-2843', name: 'Liam Hoang', initials: 'LH', email: 'liam.hoang@gmail.com', phone: '093 221 9405', appointments: 22, spending: '₫10.240.000', joined: '20 Nov 2025', status: 'Active' },
  { id: 'USR-2842', name: 'Oliver Do', initials: 'OD', email: 'oliver.do@gmail.com', phone: '097 448 2277', appointments: 2, spending: '₫680.000', joined: '01 Jul 2026', status: 'Blocked' },
  { id: 'USR-2841', name: 'Mason Pham', initials: 'MP', email: 'mason.pham@gmail.com', phone: '090 882 3107', appointments: 9, spending: '₫3.670.000', joined: '28 Apr 2026', status: 'Active' },
];

export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery = `${user.name} ${user.email} ${user.phone}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = status === 'All statuses' || user.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);

  return (
    <>
      <AdminPageHeader
        eyebrow="CUSTOMER MANAGEMENT"
        title="Users"
        description="Manage customer accounts, activity, booking history, and account status."
        actions={<button className="admin-primary-button" type="button">+ Add new user</button>}
      />

      <section className="admin-module-metrics admin-module-metrics--four">
        {[
          ['Total users', '2,846', '+8.2%', 'gold'],
          ['Active users', '2,614', '91.8%', 'green'],
          ['New this month', '184', '+18.3%', 'blue'],
          ['Blocked accounts', '12', '0.4%', 'red'],
        ].map(([label, value, change, tone]) => (
          <article className={`admin-module-metric is-${tone}`} key={label}>
            <span>{label}</span><strong>{value}</strong><em>{change}</em>
          </article>
        ))}
      </section>

      <section className="admin-panel admin-management-panel">
        <div className="admin-toolbar">
          <div className="admin-toolbar__search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or phone..."
              type="search"
            />
          </div>
          <div className="admin-toolbar__filters">
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Blocked</option>
            </select>
            <select defaultValue="Newest first">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Highest spending</option>
            </select>
            <button className="admin-secondary-button" type="button">Export CSV</button>
          </div>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table admin-module-table">
            <thead>
              <tr>
                <th>User</th><th>Contact</th><th>Appointments</th><th>Total spending</th><th>Joined</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-customer-cell">
                      <span>{user.initials}</span>
                      <div><strong>{user.name}</strong><small>{user.id}</small></div>
                    </div>
                  </td>
                  <td><div className="admin-contact-cell"><strong>{user.email}</strong><span>{user.phone}</span></div></td>
                  <td>{user.appointments}</td>
                  <td className="admin-amount-cell">{user.spending}</td>
                  <td>{user.joined}</td>
                  <td><span className={`admin-status-badge is-${user.status.toLowerCase()}`}>{user.status}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button">View</button>
                      <button type="button">Edit</button>
                      <button className="is-danger" type="button">Block</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>Showing {filteredUsers.length} of 2,846 users</span>
          <div><button type="button">←</button><button className="is-active" type="button">1</button><button type="button">2</button><button type="button">3</button><button type="button">→</button></div>
        </div>
      </section>
    </>
  );
}