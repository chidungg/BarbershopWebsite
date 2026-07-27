import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/SignupPage.css";

const CAPTCHA_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCaptcha(length = 6): string {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * CAPTCHA_CHARACTERS.length);
    return CAPTCHA_CHARACTERS[index];
  }).join("");
}

type SignupResponse = {
  success: boolean;
  code:
    | "signup_success"
    | "signup_verification_required"
    | "missing_signup_fields"
    | "invalid_full_name"
    | "invalid_email"
    | "invalid_phone"
    | "password_mismatch"
    | "weak_password"
    | "email_already_registered"
    | "signup_rate_limited"
    | "invalid_signup_data"
    | "supabase_service_unavailable"
    | "signup_verification_resent"
    | "confirmation_email_not_authorized"
    | "confirmation_email_rate_limited";
  message: string;
  data?: {
    id: string;
    email?: string;
    verificationRequired: boolean;
  };
};


export default function SignupPage() {
  const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? "http://localhost:3000";
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function refreshCaptcha() {
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
  }

  function handleGoogleSignup() {
    setErrorMessage("");
    window.location.assign(`${BACKEND_BASE_URL}/auth/google`);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const normalizedPhone = phone.replace(/[\s.-]/g, "");

    if (fullName.length < 2) {
        setErrorMessage("Full name must contain at least 2 characters.");
        return;
    }

    if (!email) {
        setErrorMessage("Please enter your email address.");
        return;
    }

    if (!/^(?:\+84|0)\d{9}$/.test(normalizedPhone)) {
        setErrorMessage("Please enter a valid Vietnamese phone number.");
        return;
    }

    if (password.length < 8) {
        setErrorMessage("Password must contain at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        setErrorMessage("Confirm password does not match.");
        return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaCode) {
        setCaptchaCode(generateCaptcha());
        setCaptchaInput("");
        setErrorMessage("Captcha code is incorrect.");
        return;
    }

    setIsSubmitting(true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            fullName,
            email,
            phone: normalizedPhone,
            password,
            confirmPassword,
        }),
        });

        const result = (await response.json().catch(() => null)) as SignupResponse | null;

        if (!result) {
        setErrorMessage("The server returned an invalid response.");
        return;
        }

        if (response.ok && result.code === "signup_verification_required") {
        window.alert("Account created successfully. Please check your email and verify your account.");
        navigate("/login", { replace: true });
        return;
        }

        if (response.ok && result.code === "signup_success") {
        window.alert("Account created successfully.");
        navigate("/login", { replace: true });
        return;
        }

        const errorMessages: Record<SignupResponse["code"], string> = {
        signup_success: "Account created successfully.",
        signup_verification_required: "Please verify your email.",
        missing_signup_fields: "Please complete all required fields.",
        invalid_full_name: "Full name is invalid.",
        invalid_email: "Email address is invalid.",
        invalid_phone: "Phone number is invalid.",
        password_mismatch: "Confirm password does not match.",
        weak_password: "Password does not meet the security requirements.",
        email_already_registered: "This email address is already registered.",
        signup_rate_limited: "Too many signup attempts. Please try again later.",
        invalid_signup_data: "Signup information is invalid.",
        supabase_service_unavailable: "Cannot connect to Supabase. Please try again later.",
        signup_verification_resent:"A new confirmation email has been sent.",
        confirmation_email_not_authorized:"Supabase cannot configure Custom SMTP so it cannot send email to your address.",
        confirmation_email_rate_limited:"We have sent too many emails. Please try again later.",
        };

        setErrorMessage(errorMessages[result.code] ?? result.message);
        setCaptchaCode(generateCaptcha());
        setCaptchaInput("");
    } catch (error) {
        console.error("Signup request failed:", error);
        setErrorMessage("Cannot connect to the backend server.");
    } finally {
        setIsSubmitting(false);
    }
}

  return (
    <main className="login-page signup-page">
      <section className="login-visual" aria-label="Gentleman's Barbershop">
        <div className="login-visual__overlay" />

        <div className="brand">
          <img className="brand__logo" src="/images/logo.png" alt="Gentleman's Barbershop logo" />

          <div className="brand__copy">
            <span>GENTLEMAN'S BARBERSHOP</span>
            <small>PREMIUM GROOMING</small>
          </div>
        </div>

        <div className="hero-copy">
          <p className="hero-copy__title">
            <b>Your next look</b>
             <b>starts here.</b>
            <em>Join the experience.</em>
          </p>

          <div className="hero-copy__divider" />

          <p className="hero-copy__description">
            Create your account to discover trusted barbers, premium services, and a booking experience designed around you.
          </p>
        </div>
      </section>

      <section className="login-panel signup-panel">
        <div className="login-card signup-card">
          <header className="login-card__header signup-card__header">
            <div className="ornament" aria-hidden="true">
              <span />
              <b>◆</b>
              <span />
            </div>

            <p className="eyebrow">JOIN THE EXPERIENCE</p>
            <h1>Create your account</h1>
            <p>Enter your information to start booking premium grooming services</p>
          </header>

          <form className="login-form signup-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="fullName">Full name</label>

              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" />
                </svg>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyen Van A"
                  minLength={2}
                  required
                />
              </div>
            </div>

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
              <label htmlFor="phone">Phone number</label>

              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.2 3.5 9.5 8 7.8 9.7a15.6 15.6 0 0 0 6.5 6.5l1.7-1.7 4.5 2.3v2.7a1.5 1.5 0 0 1-1.5 1.5C10.2 21 3 13.8 3 5a1.5 1.5 0 0 1 1.5-1.5h2.7Z" />
                </svg>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0901234567"
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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm password</label>

              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5.5" y="10" width="13" height="10" rx="1.5" />
                  <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                </svg>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  minLength={8}
                  required
                />

                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="captcha-section">
              <label htmlFor="captcha">Captcha verification</label>

              <div className="captcha-box">
                <div className="captcha-code" aria-label={`Captcha code: ${captchaCode}`}>
                  <span>{captchaCode}</span>
                </div>

                <button
                  className="captcha-refresh"
                  type="button"
                  title="Generate a new captcha"
                  aria-label="Generate a new captcha"
                  onClick={refreshCaptcha}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 7v5h-5" />
                    <path d="M18.2 16a8 8 0 1 1 .7-8.7L20 12" />
                  </svg>
                </button>

                <div className="input-shell captcha-input">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>

                  <input
                    id="captcha"
                    name="captcha"
                    type="text"
                    value={captchaInput}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Enter captcha"
                    maxLength={6}
                    onChange={(event) => setCaptchaInput(event.target.value)}
                    required
                  />
                </div>
              </div>

              <small className="captcha-help">Enter the six characters shown in the captcha image.</small>
            </div>

            {errorMessage && (
              <p className="form-error" role="alert" aria-live="polite">
                {errorMessage}
              </p>
            )}

            <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
            </button>

            <div className="separator" aria-hidden="true">
              <span />
              <small>or</small>
              <span />
            </div>

            <button className="google-button" type="button" onClick={handleGoogleSignup}>
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
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </section>
    </main>
  );
}