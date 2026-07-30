import { useState } from 'react';

import AdminPageHeader from './AdminPageHeader';

const settingTabs = ['General', 'Business hours', 'Appointments', 'Payments', 'Notifications', 'Security'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('General');

  return (
    <>
      <AdminPageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings"
        description="Manage business information, policies, notifications, payments, and security."
        actions={<button className="admin-primary-button" type="button">Save changes</button>}
      />

      <section className="admin-settings-layout">
        <aside className="admin-panel admin-settings-tabs">
          {settingTabs.map((tab) => <button className={activeTab === tab ? 'is-active' : undefined} key={tab} type="button" onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </aside>

        <div className="admin-panel admin-settings-content">
          {activeTab === 'General' && (
            <>
              <div className="admin-settings-section-heading"><div><h2>General information</h2><p>Basic information displayed across the customer website and receipts.</p></div></div>
              <div className="admin-logo-setting"><img src="/images/logo.png" alt="Current barbershop logo" /><div><strong>Business logo</strong><span>PNG, JPG, or SVG. Maximum 2 MB.</span><button className="admin-secondary-button" type="button">Change logo</button></div></div>
              <div className="admin-form-grid admin-form-grid--two">
                <label><span>Business name</span><input defaultValue="Gentleman's Barbershop" /></label>
                <label><span>Business email</span><input defaultValue="contact@gentlemans.vn" type="email" /></label>
                <label><span>Phone number</span><input defaultValue="+84 28 3822 1688" /></label>
                <label><span>Tax identification number</span><input defaultValue="0312345678" /></label>
                <label className="admin-form-field--full"><span>Business address</span><input defaultValue="123 Nguyen Hue, District 1, Ho Chi Minh City" /></label>
                <label className="admin-form-field--full"><span>Business description</span><textarea defaultValue="Premium men's grooming and professional barber services." rows={4} /></label>
              </div>
            </>
          )}

          {activeTab === 'Business hours' && (
            <>
              <div className="admin-settings-section-heading"><div><h2>Business hours</h2><p>Configure normal opening hours. Special holidays can be managed separately.</p></div><button className="admin-secondary-button" type="button">Add holiday</button></div>
              <div className="admin-business-hours-form">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => <div key={day}><label><input defaultChecked type="checkbox" />{day}</label><input defaultValue={index < 5 ? '09:00' : '10:00'} type="time" /><span>to</span><input defaultValue={index === 5 ? '20:00' : index === 6 ? '17:00' : '19:00'} type="time" /><button type="button">Copy</button></div>)}
              </div>
            </>
          )}

          {activeTab === 'Appointments' && (
            <>
              <div className="admin-settings-section-heading"><div><h2>Appointment policies</h2><p>Control booking windows, cancellations, reminders, and time-slot behavior.</p></div></div>
              <div className="admin-form-grid admin-form-grid--two">
                <label><span>Minimum booking notice</span><select defaultValue="2 hours"><option>1 hour</option><option>2 hours</option><option>4 hours</option><option>1 day</option></select></label>
                <label><span>Maximum advance booking</span><select defaultValue="30 days"><option>14 days</option><option>30 days</option><option>60 days</option></select></label>
                <label><span>Default slot interval</span><select defaultValue="15 minutes"><option>10 minutes</option><option>15 minutes</option><option>30 minutes</option></select></label>
                <label><span>Free cancellation period</span><select defaultValue="12 hours"><option>6 hours</option><option>12 hours</option><option>24 hours</option></select></label>
              </div>
              <div className="admin-toggle-list"><label><div><strong>Allow customer rescheduling</strong><span>Customers can change their booking before the cancellation deadline.</span></div><input defaultChecked type="checkbox" /></label><label><div><strong>Automatic appointment confirmation</strong><span>Confirm bookings immediately when payment succeeds.</span></div><input defaultChecked type="checkbox" /></label><label><div><strong>Waitlist</strong><span>Allow users to join a waitlist when a time slot is full.</span></div><input type="checkbox" /></label></div>
            </>
          )}

          {activeTab === 'Payments' && (
            <><div className="admin-settings-section-heading"><div><h2>Payment settings</h2><p>Enable customer payment methods and configure transaction behavior.</p></div></div><div className="admin-toggle-list"><label><div><strong>Cash</strong><span>Allow customers to pay at the barbershop.</span></div><input defaultChecked type="checkbox" /></label><label><div><strong>Bank transfer</strong><span>Accept payments to the configured bank account.</span></div><input defaultChecked type="checkbox" /></label><label><div><strong>QR payment</strong><span>Display a QR code during checkout.</span></div><input defaultChecked type="checkbox" /></label><label><div><strong>Credit or debit card</strong><span>Accept card payments through the payment gateway.</span></div><input type="checkbox" /></label></div><div className="admin-form-grid admin-form-grid--two"><label><span>Currency</span><select defaultValue="VND"><option>VND</option><option>USD</option></select></label><label><span>Refund approval</span><select defaultValue="Administrator only"><option>Administrator only</option><option>Administrator or manager</option></select></label></div></>
          )}

          {activeTab === 'Notifications' && (
            <><div className="admin-settings-section-heading"><div><h2>Notification preferences</h2><p>Choose which events trigger administrator email or in-app notifications.</p></div></div><div className="admin-toggle-list">{[['New appointment', 'Notify when a customer creates a booking.'], ['Appointment cancellation', 'Notify when a customer or barber cancels.'], ['Failed payment', 'Notify when an online transaction fails.'], ['Negative review', 'Notify for ratings of two stars or below.'], ['Barber leave request', 'Notify when a barber submits leave.'], ['Daily summary', 'Send a daily operational summary at 20:00.']].map(([title, description], index) => <label key={title}><div><strong>{title}</strong><span>{description}</span></div><input defaultChecked={index < 5} type="checkbox" /></label>)}</div></>
          )}

          {activeTab === 'Security' && (
            <><div className="admin-settings-section-heading"><div><h2>Security</h2><p>Manage administrator password, two-factor authentication, and active sessions.</p></div></div><div className="admin-security-card"><div><strong>Password</strong><span>Last changed 42 days ago.</span></div><button className="admin-secondary-button" type="button">Change password</button></div><div className="admin-security-card"><div><strong>Two-factor authentication</strong><span>Add an additional verification step for administrator access.</span></div><button className="admin-primary-button" type="button">Enable 2FA</button></div><div className="admin-security-card"><div><strong>Active sessions</strong><span>3 administrator sessions are currently active.</span></div><button className="admin-secondary-button" type="button">Manage sessions</button></div></>
          )}
        </div>
      </section>
    </>
  );
}