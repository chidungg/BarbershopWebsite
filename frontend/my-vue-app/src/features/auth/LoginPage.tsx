import { useState, type SubmitEvent } from "react";
import "../../assets/LoginPage.css";


export default function LoginPage() {
    type LoginResponse = {
    success: boolean;
    code:
        | "login_success"
        | "invalid_credentials"
        | "supabase_service_unavailable"
        | "missing_credentials";
    message: string;
    data?: {
        id: string;
        email?: string;
    };
    };

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";
    const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? "http://localhost:3000";
    
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    function handleGoogleLogin() {
      setErrorMessage("");
      window.location.assign(`${BACKEND_BASE_URL}/auth/google`);
    }
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>,) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "",).trim();
    const password = String(formData.get("password") ?? "",);
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {"Content-Type": "application/json",},
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      let result: LoginResponse;
      try {
        result =(await response.json()) as LoginResponse;
      } catch {
        window.alert("Kết nối Supabase thất bại.");
        return;
      }

      if (
        response.ok &&
        result.code === "login_success"
      ) {
        window.alert("Đăng nhập thành công.");
        return;
      }

      if (
        response.status === 401 ||
        result.code === "invalid_credentials"
      ) {
        window.alert("Sai email hoặc mật khẩu.");
        return;
      }

      window.alert("Kết nối Supabase thất bại.");
    } catch (error) {
      console.error("Login request failed:", error);

      window.alert("Kết nối Supabase thất bại.");
    } finally {
      setIsSubmitting(false);
    }
}

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Gentlemans' Barbershop">
        <div className="login-visual__overlay" />

        <div className="brand">
          <img
            className="brand__logo"
            src="/images/logo.png"
            alt="Gentleman's Barbershop logo"
            />

          <div className="brand__copy">
            <span>GENTLEMAN'S BARBERSHOP</span>
            <small>PREMIUM GROOMING</small>
          </div>
        </div>

        <div className="hero-copy">
          <p className="hero-copy__title">
            More than a haircut.
            <em>Define your style.</em>
          </p>

          <div className="hero-copy__divider" />

          <p className="hero-copy__description">
            Discover trusted barbers, premium services, and a booking experience
            designed around you.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <header className="login-card__header">
            <div className="ornament" aria-hidden="true">
              <span />
              <b>◆</b>
              <span />
            </div>

            <p className="eyebrow">WELCOME BACK</p>
            <h1>Sign in to your account</h1>
            <p>Access your appointments and manage your bookings</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.5 5.5h17v13h-17z" />
                  <path d="m4.5 7 7.5 6 7.5-6" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5.5" y="10" width="13" height="10" rx="1.5" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                </svg>

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span aria-hidden="true" />
                Remember me
              </label>

              <a href="/forgot-password">Forgot password?</a>
            </div>

            {errorMessage && (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>

            <div className="separator" aria-hidden="true">
              <span />
              <small>or</small>
              <span />
            </div>

            <button className="google-button" type="button" onClick={handleGoogleLogin}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.39a4.61 4.61 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.97-4.33 2.97-7.41Z" />
                <path d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z" />
                <path d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.54l3.35-2.61Z" />
                <path d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.61C7.18 7.7 9.39 5.94 12 5.94Z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="signup-copy">
            New to Gentleman's Barbershop? <a href="/register">Create an account</a>
          </p>
        </div>
      </section>
    </main>
  );
}