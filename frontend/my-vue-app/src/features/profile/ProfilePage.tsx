import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../shared/AuthContext';
import ProfileIcon from '../../shared/ProfileIcon';
import SiteHeader from '../../shared/SiteHeader';
import './ProfilePage.css';

type ProfileSection = 'overview' | 'appointments' | 'details' | 'security';
type Notice = { kind: 'success' | 'danger'; message: string } | null;

const sectionItems: Array<{
  id: ProfileSection;
  label: string;
  icon: 'appointments' | 'contact' | 'dashboard' | 'shield';
}> = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'appointments', label: 'Appointments', icon: 'appointments' },
  { id: 'details', label: 'Personal details', icon: 'contact' },
  { id: 'security', label: 'Security', icon: 'shield' },
];

function isProfileSection(value: string | null): value is ProfileSection {
  return sectionItems.some((item) => item.id === value);
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0];
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const activeSection: ProfileSection = isProfileSection(requestedSection)
    ? requestedSection
    : 'overview';

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.fullName, user?.phone]);

  if (!user) return null;

  const displayName = user.fullName || user.email.split('@')[0];
  const firstName = displayName.trim().split(/\s+/).at(-1) || displayName;

  function chooseSection(section: ProfileSection) {
    setProfileNotice(null);
    setPasswordNotice(null);
    setSearchParams(section === 'overview' ? {} : { section });
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileNotice(null);

    try {
      const message = await updateProfile({ fullName, phone });
      setProfileNotice({ kind: 'success', message });
    } catch (error) {
      setProfileNotice({
        kind: 'danger',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to update your profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsChangingPassword(true);
    setPasswordNotice(null);

    try {
      const message = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ kind: 'success', message });
    } catch (error) {
      setPasswordNotice({
        kind: 'danger',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to update your password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <main className="profile-page">
      <SiteHeader currentPage="profile" />

      <section className="container profile-page__content">
        <header className="profile-page__heading d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-4">
          <div>
            <p className="profile-eyebrow">MY ACCOUNT</p>
            <h1>Welcome back, {firstName}.</h1>
          </div>
          <a className="btn profile-primary-button" href="/#booking">
            <ProfileIcon name="plus" />
            New booking
          </a>
        </header>

        <div className="row g-4 align-items-start">
          <aside className="col-lg-3">
            <div className="card profile-sidebar">
              <div className="profile-sidebar__identity">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{getInitials(user.fullName, user.email)}</span>
                )}
                <div>
                  <strong>{displayName}</strong>
                  <small>{user.email}</small>
                </div>
              </div>

              <nav
                className="nav nav-pills profile-sidebar__nav"
                aria-label="Profile sections"
              >
                {sectionItems.map((item) => (
                  <button
                    className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                    type="button"
                    key={item.id}
                    aria-current={
                      activeSection === item.id ? 'page' : undefined
                    }
                    onClick={() => chooseSection(item.id)}
                  >
                    <ProfileIcon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="col-lg-9">
            {activeSection === 'overview' && (
              <section aria-labelledby="overview-title">
                <div className="profile-section-heading">
                  <div>
                    <p className="profile-eyebrow">AT A GLANCE</p>
                    <h2 id="overview-title">Your next appointment</h2>
                  </div>
                </div>

                <article className="card profile-empty-appointment">
                  <div className="profile-empty-appointment__icon">
                    <ProfileIcon name="calendar" />
                  </div>
                  <div>
                    <h3>No upcoming appointment</h3>
                  </div>
                  <a className="btn profile-outline-button" href="/#booking">
                    Book an appointment
                  </a>
                </article>

                <div className="row g-3 mt-1">
                  <div className="col-md-4">
                    <article className="card profile-stat h-100">
                      <span>Total visits</span>
                      <strong>0</strong>
                    </article>
                  </div>
                  <div className="col-md-4">
                    <article className="card profile-stat h-100">
                      <span>Favourite service</span>
                      <strong>—</strong>
                    </article>
                  </div>
                  <div className="col-md-4">
                    <article className="card profile-stat h-100">
                      <span>Favourite barber</span>
                      <strong>—</strong>
                    </article>
                  </div>
                </div>

                <article className="card profile-history-card mt-3">
                  <header>
                    <h3>Recent appointments</h3>
                    <button
                      type="button"
                      onClick={() => chooseSection('appointments')}
                    >
                      View all
                    </button>
                  </header>
                  <div className="profile-history-empty">
                    <p>Your completed appointments will appear here.</p>
                  </div>
                </article>
              </section>
            )}

            {activeSection === 'appointments' && (
              <section aria-labelledby="appointments-title">
                <div className="profile-section-heading">
                  <div>
                    <p className="profile-eyebrow">YOUR BOOKINGS</p>
                    <h2 id="appointments-title">My appointments</h2>
                  </div>
                  <a className="btn profile-primary-button" href="/#booking">
                    <ProfileIcon name="plus" />
                    New booking
                  </a>
                </div>

                <article className="card profile-appointments-empty">
                  <span>
                    <ProfileIcon name="appointments" />
                  </span>
                  <h3>You have no appointments yet</h3>
                  <a className="btn profile-outline-button" href="/#booking">
                    Explore available times
                  </a>
                </article>
              </section>
            )}

            {activeSection === 'details' && (
              <section aria-labelledby="details-title">
                <div className="profile-section-heading">
                  <div>
                    <p className="profile-eyebrow">ACCOUNT INFORMATION</p>
                    <h2 id="details-title">Personal details</h2>
                  </div>
                </div>

                <form className="card profile-form" onSubmit={submitProfile}>
                  {profileNotice && (
                    <div
                      className={`alert alert-${profileNotice.kind}`}
                      role="alert"
                    >
                      {profileNotice.message}
                    </div>
                  )}

                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profile-full-name">
                        Full name
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <ProfileIcon name="user" />
                        </span>
                        <input
                          className="form-control"
                          id="profile-full-name"
                          value={fullName}
                          minLength={2}
                          maxLength={100}
                          required
                          onChange={(event) => setFullName(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="profile-phone">
                        Phone number
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <ProfileIcon name="phone" />
                        </span>
                        <input
                          className="form-control"
                          id="profile-phone"
                          type="tel"
                          value={phone}
                          placeholder="090 123 4567"
                          onChange={(event) => setPhone(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="profile-email">
                        Email address
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <ProfileIcon name="mail" />
                        </span>
                        <input
                          className="form-control"
                          id="profile-email"
                          type="email"
                          value={user.email}
                          disabled
                        />
                      </div>
                      <div className="form-text">
                        Your sign-in email cannot be changed here.
                      </div>
                    </div>
                  </div>

                  <div className="profile-form__actions">
                    <button
                      className="btn profile-primary-button"
                      type="submit"
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {activeSection === 'security' && (
              <section aria-labelledby="security-title">
                <div className="profile-section-heading">
                  <div>
                    <p className="profile-eyebrow">ACCOUNT SECURITY</p>
                    <h2 id="security-title">Change password</h2>
                  </div>
                </div>

                <form className="card profile-form" onSubmit={submitPassword}>
                  {passwordNotice && (
                    <div
                      className={`alert alert-${passwordNotice.kind}`}
                      role="alert"
                    >
                      {passwordNotice.message}
                    </div>
                  )}

                  <div className="row g-4">
                    <div className="col-12">
                      <label className="form-label" htmlFor="current-password">
                        Current password
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <ProfileIcon name="lock" />
                        </span>
                        <input
                          className="form-control"
                          id="current-password"
                          type="password"
                          autoComplete="current-password"
                          value={currentPassword}
                          required
                          onChange={(event) =>
                            setCurrentPassword(event.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="new-password">
                        New password
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <ProfileIcon name="shield" />
                        </span>
                        <input
                          className="form-control"
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={newPassword}
                          required
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="confirm-password">
                        Confirm new password
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <ProfileIcon name="shield" />
                        </span>
                        <input
                          className="form-control"
                          id="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={confirmPassword}
                          required
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="profile-form__actions">
                    <button
                      className="btn profile-primary-button"
                      type="submit"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </div>
      </section>

    </main>
  );
}
