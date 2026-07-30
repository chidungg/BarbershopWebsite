import type { ReactNode } from 'react';

export type AdminIconName =
  | 'appointments'
  | 'barbers'
  | 'bell'
  | 'calendar'
  | 'chevronDown'
  | 'customers'
  | 'dashboard'
  | 'logout'
  | 'menu'
  | 'more'
  | 'payments'
  | 'reports'
  | 'revenue'
  | 'search'
  | 'services'
  | 'settings'
  | 'star'
  | 'trendDown'
  | 'trendUp';

type AdminIconProps = {
  name: AdminIconName;
  size?: number;
};

export default function AdminIcon({ name, size = 20 }: AdminIconProps) {
  const paths: Record<AdminIconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    revenue: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19V3" />
        <path d="M2 21h22" />
      </>
    ),
    customers: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    barbers: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 22v-2.5a6.5 6.5 0 0 1 13 0V22" />
        <path d="M8 11.5c1.1 1 2.45 1.5 4 1.5s2.9-.5 4-1.5" />
      </>
    ),
    appointments: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="m9 16 2 2 4-5" />
      </>
    ),
    payments: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19" />
        <path d="M7 15h2" />
      </>
    ),
    services: (
      <>
        <path d="m14.7 6.3 3-3a2.1 2.1 0 0 1 3 3l-3 3" />
        <path d="m9.3 17.7-3 3a2.1 2.1 0 0 1-3-3l3-3" />
        <path d="m8 16 8-8" />
        <circle cx="7" cy="7" r="3" />
        <circle cx="17" cy="17" r="3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    reports: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.64.96.3.28.68.43 1.08.44H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    chevronDown: <path d="m7 10 5 5 5-5" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    trendUp: <path d="m3 17 6-6 4 4 8-9M15 6h6v6" />,
    trendDown: <path d="m3 7 6 6 4-4 8 9M15 18h6v-6" />,
    star: <path d="m12 2.5 2.9 5.88 6.49.95-4.7 4.58 1.11 6.47L12 17.32l-5.8 3.06 1.11-6.47-4.7-4.58 6.49-.95L12 2.5Z" />,
  };

  return (
    <svg
      aria-hidden="true"
      className="admin-icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        {paths[name]}
      </g>
    </svg>
  );
}