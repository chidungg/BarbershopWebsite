import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/$/, '');

export type AppRole = 'admin' | 'barber' | 'user';

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  redirectTo: string;
};

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type ApiPayload<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type ProfileInput = {
  fullName: string;
  phone: string;
};

type PasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AuthContextValue = {
  user: CurrentUser | null;
  status: AuthStatus;
  error: string;
  refreshCurrentUser: () => Promise<CurrentUser | null>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<string>;
  changePassword: (input: PasswordInput) => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readPayload<T>(response: Response): Promise<ApiPayload<T>> {
  try {
    return (await response.json()) as ApiPayload<T>;
  } catch {
    return {
      success: false,
      message: 'The server returned an invalid response.',
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const refreshCurrentUser = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const payload = await readPayload<CurrentUser>(response);

      if (currentRequest !== requestId.current) return null;

      if (response.ok && payload.success && payload.data) {
        setUser(payload.data);
        setStatus('authenticated');
        return payload.data;
      }

      if (response.status === 401 || response.status === 403) {
        setUser(null);
        setStatus('unauthenticated');
        return null;
      }

      throw new Error(payload.message ?? 'Unable to verify your session.');
    } catch (requestError) {
      if (currentRequest !== requestId.current) return null;
      setUser(null);
      setStatus('error');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to verify your session.',
      );
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  const logout = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const payload = await readPayload<never>(response);
      throw new Error(payload.message ?? 'Unable to sign out.');
    }

    requestId.current += 1;
    setUser(null);
    setStatus('unauthenticated');
    setError('');
  }, []);

  const updateProfile = useCallback(async (input: ProfileInput) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    const payload = await readPayload<CurrentUser>(response);

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.message ?? 'Unable to update your profile.');
    }

    setUser(payload.data);
    setStatus('authenticated');
    return payload.message ?? 'Profile updated successfully.';
  }, []);

  const changePassword = useCallback(async (input: PasswordInput) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    const payload = await readPayload<never>(response);

    if (!response.ok || !payload.success) {
      throw new Error(payload.message ?? 'Unable to update your password.');
    }

    return payload.message ?? 'Password updated successfully.';
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      refreshCurrentUser,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      changePassword,
      error,
      logout,
      refreshCurrentUser,
      status,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
