import AdminPageHeader from './AdminPageHeader';

const payments = [
  ['PAY-9031', 'APT-1048', 'Ethan Nguyen', '₫350.000', 'QR Payment', 'TXN-882190', '30 Jul 2026, 09:24', 'Paid'],
  ['PAY-9030', 'APT-1047', 'Lucas Tran', '₫520.000', 'Bank Transfer', 'TXN-882174', '30 Jul 2026, 10:02', 'Paid'],
  ['PAY-9029', 'APT-1046', 'Noah Le', '₫280.000', 'Cash', 'Manual', '30 Jul 2026, 10:54', 'Pending'],
  ['PAY-9028', 'APT-1045', 'Liam Hoang', '₫680.000', 'Credit Card', 'TXN-882151', '30 Jul 2026, 13:30', 'Paid'],
  ['PAY-9027', 'APT-1044', 'Oliver Do', '₫320.000', 'QR Payment', 'TXN-882122', '30 Jul 2026, 15:10', 'Refunded'],
  ['PAY-9026', 'APT-1043', 'Mason Pham', '₫520.000', 'E-wallet', 'TXN-882091', '29 Jul 2026, 17:42', 'Failed'],
];

export default function PaymentsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="TRANSACTION MANAGEMENT"
        title="Payments"
        description="Monitor payment status, manual confirmations, receipts, and refunds."
        actions={<button className="admin-primary-button" type="button">Export transactions</button>}
      />

      <section className="admin-module-metrics admin-module-metrics--five">
        {[
          ['Total processed', '₫128.45M', 'This month', 'gold'],
          ['Successful', '₫119.86M', '96.8%', 'green'],
          ['Pending', '₫2.14M', '7 transactions', 'orange'],
          ['Failed', '₫1.21M', '4 transactions', 'red'],
          ['Refunded', '₫3.24M', '9 transactions', 'blue'],
        ].map(([label, value, change, tone]) => (
          <article className={`admin-module-metric is-${tone}`} key={label}><span>{label}</span><strong>{value}</strong><em>{change}</em></article>
        ))}
      </section>

      <section className="admin-panel admin-management-panel">
        <div className="admin-toolbar">
          <div className="admin-toolbar__search"><input placeholder="Search payment, transaction, customer..." type="search" /></div>
          <div className="admin-toolbar__filters">
            <select defaultValue="All methods"><option>All methods</option><option>Cash</option><option>Bank Transfer</option><option>QR Payment</option><option>Credit Card</option><option>E-wallet</option></select>
            <select defaultValue="All statuses"><option>All statuses</option><option>Paid</option><option>Pending</option><option>Failed</option><option>Refunded</option></select>
            <input type="date" defaultValue="2026-07-30" />
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table admin-module-table">
            <thead><tr><th>Payment</th><th>Appointment</th><th>Customer</th><th>Amount</th><th>Method</th><th>Reference</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {payments.map(([paymentId, appointmentId, customer, amount, method, reference, date, status]) => (
                <tr key={paymentId}>
                  <td><strong>#{paymentId}</strong></td><td>#{appointmentId}</td><td>{customer}</td><td className="admin-amount-cell">{amount}</td><td>{method}</td><td><code className="admin-reference-code">{reference}</code></td><td>{date}</td><td><span className={`admin-status-badge is-${status.toLowerCase()}`}>{status}</span></td>
                  <td><div className="admin-row-actions"><button type="button">Details</button>{status === 'Paid' && <button type="button">Receipt</button>}{status === 'Pending' && <button type="button">Confirm</button>}{status === 'Paid' && <button className="is-danger" type="button">Refund</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination"><span>Showing 6 of 482 transactions</span><div><button type="button">←</button><button className="is-active" type="button">1</button><button type="button">2</button><button type="button">3</button><button type="button">→</button></div></div>
      </section>
    </>
  );
}