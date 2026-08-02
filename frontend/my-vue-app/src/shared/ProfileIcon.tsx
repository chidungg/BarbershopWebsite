type ProfileIconName =
  | 'appointments'
  | 'calendar'
  | 'chevron'
  | 'contact'
  | 'dashboard'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'menu'
  | 'phone'
  | 'plus'
  | 'shield'
  | 'user';

const paths: Record<ProfileIconName, ReactNode> = {
  appointments: (
    <>
      <path d="M6 3v3M18 3v3M4 9h16" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="m9 15 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <path d="M6 3v3M18 3v3M4 9h16" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  contact: (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="5" rx="1" />
      <circle cx="12" cy="12" r="2" />
      <path d="M8.5 18a3.5 3.5 0 0 1 7 0" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  phone: (
    <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.36 2.3.55 3.6.55a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.6 21 3 13.4 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.56 3.6a1 1 0 0 1-.25 1Z" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.9 7.5-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export default function ProfileIcon({ name }: { name: ProfileIconName }) {
  return (
    <svg
      className="profile-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
import type { ReactNode } from 'react';
