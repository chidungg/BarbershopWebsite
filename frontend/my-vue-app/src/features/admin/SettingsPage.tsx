import { useEffect, useState } from 'react';
import AdminPageHeader from './AdminPageHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const settingTabs = ['General', 'Appointments', 'Payments'] as const;

type SettingTab = (typeof settingTabs)[number];

type SettingsData = {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  bookingAdvanceDays: number;
  cancellationNoticeHours: number;
  defaultSlotMinutes: number;
  updatedAt?: string;
};

type SettingsResponse = {
  success: boolean;
  message?: string;
  data?: SettingsData;
};

const emptySettings: SettingsData = {
  shopName: "",
  address: "",
  phone: "",
  email: "",
  timezone: "Asia/Ho_Chi_Minh",
  currency: "VND",
  bookingAdvanceDays: 30,
  cancellationNoticeHours: 2,
  defaultSlotMinutes: 30,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingTab>('General');
  const [settings, setSettings] = useState<SettingsData>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      try {
        const response = await fetch(`${API_BASE_URL}/administrator/settings`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        const payload = (await response.json()) as SettingsResponse;
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? 'Unable to load settings.');

        setSettings(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to load settings.' });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSettings();
    return () => controller.abort();
  }, []);

  function updateField<K extends keyof SettingsData>(field: K, value: SettingsData[K]) {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/administrator/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(settings),
      });

      const payload = (await response.json()) as SettingsResponse;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.message ?? 'Unable to save settings.');

      setSettings(payload.data);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save settings.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="SYSTEM CONFIGURATION"
        title="Settings"
        description="Manage business information, booking policies, and payment currency."
        actions={
          <button className="admin-primary-button" type="button" disabled={loading || saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        }
      />

      {message && <div className={`admin-settings-message is-${message.type}`}>{message.text}</div>}

      {loading ? (
        <section className="admin-panel admin-module-panel"><span>Loading settings...</span></section>
      ) : (
        <section className="admin-settings-layout">
          <aside className="admin-panel admin-settings-tabs">
            {settingTabs.map((tab) => (
              <button className={activeTab === tab ? 'is-active' : undefined} key={tab} type="button" onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </aside>

          <div className="admin-panel admin-settings-content">
            {activeTab === 'General' && (
              <>
                <div className="admin-settings-section-heading">
                  <div>
                    <h2>General information</h2>
                    <p>Business information stored in the shop configuration.</p>
                  </div>
                </div>

                <div className="admin-form-grid admin-form-grid--two">
                  <label>
                    <span>Business name</span>
                    <input value={settings.shopName} onChange={(event) => updateField('shopName', event.target.value)} />
                  </label>

                  <label>
                    <span>Business email</span>
                    <input value={settings.email} type="email" onChange={(event) => updateField('email', event.target.value)} />
                  </label>

                  <label>
                    <span>Phone number</span>
                    <input value={settings.phone} onChange={(event) => updateField('phone', event.target.value)} />
                  </label>

                  <label>
                    <span>Timezone</span>
                    <input value={settings.timezone} onChange={(event) => updateField('timezone', event.target.value)} />
                  </label>

                  <label className="admin-form-field--full">
                    <span>Business address</span>
                    <input value={settings.address} onChange={(event) => updateField('address', event.target.value)} />
                  </label>
                </div>
              </>
            )}

            {activeTab === 'Appointments' && (
              <>
                <div className="admin-settings-section-heading">
                  <div>
                    <h2>Appointment policies</h2>
                    <p>Configure booking limits, cancellation notice, and default appointment slot length.</p>
                  </div>
                </div>

                <div className="admin-form-grid admin-form-grid--two">
                  <label>
                    <span>Maximum advance booking</span>
                    <input
                      value={settings.bookingAdvanceDays}
                      min={1}
                      max={365}
                      type="number"
                      onChange={(event) => updateField('bookingAdvanceDays', Number(event.target.value))}
                    />
                    <small>Days customers can book in advance.</small>
                  </label>

                  <label>
                    <span>Cancellation notice</span>
                    <input
                      value={settings.cancellationNoticeHours}
                      min={0}
                      max={168}
                      type="number"
                      onChange={(event) => updateField('cancellationNoticeHours', Number(event.target.value))}
                    />
                    <small>Required notice in hours before cancellation.</small>
                  </label>

                  <label>
                    <span>Default slot interval</span>
                    <input
                      value={settings.defaultSlotMinutes}
                      min={5}
                      max={240}
                      type="number"
                      onChange={(event) => updateField('defaultSlotMinutes', Number(event.target.value))}
                    />
                    <small>Default booking slot duration in minutes.</small>
                  </label>
                </div>
              </>
            )}

            {activeTab === 'Payments' && (
              <>
                <div className="admin-settings-section-heading">
                  <div>
                    <h2>Payment settings</h2>
                    <p>Configure the default currency used throughout the barbershop.</p>
                  </div>
                </div>

                <div className="admin-form-grid admin-form-grid--two">
                  <label>
                    <span>Currency</span>
                    <input
                      value={settings.currency}
                      maxLength={3}
                      placeholder="VND"
                      onChange={(event) => updateField('currency', event.target.value.toUpperCase())}
                    />
                    <small>ISO currency code, for example VND or USD.</small>
                  </label>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}