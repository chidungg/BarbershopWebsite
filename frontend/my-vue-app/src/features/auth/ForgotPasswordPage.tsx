import { useState, type SubmitEvent } from "react";
import { Link,useNavigate } from "react-router-dom";
import "../../assets/ForgotPasswordPage.css";
import type {SendOtpResponse, ForgotPasswordStep ,StatusMessage, EmailLookupState, CheckEmailResponse, VerifyOtpResponse, ResetPasswordResponse} from "./auth.type"


const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:3000/api"
).replace(/\/$/, "");


function generateCaptcha(length = 6) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  return Array.from(
    { length },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgotPasswordStep>("request");
  const [email, setEmail] = useState("");
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [emailLookupState, setEmailLookupState] = useState<EmailLookupState>("idle");

  const headerContent = {
    request: {
      eyebrow: "ACCOUNT RECOVERY",
      title: "Forgot your password?",
      description:
        "Enter your email address and complete the security check to receive a verification code.",
    },
    verify: {
      eyebrow: "VERIFY YOUR IDENTITY",
      title: "Enter verification code",
      description:
        "We sent a eight-digit verification code to your email address.",
    },
    reset: {
      eyebrow: "CREATE NEW PASSWORD",
      title: "Secure your account",
      description:
        "Your verification code is correct. Create a new password for your account.",
    },
  }[step];

  function refreshCaptcha(clearMessage = true) {
  setCaptchaCode(generateCaptcha());
  setCaptchaInput("");

  if (clearMessage) {
    setMessage(null);
  }
}

  function resetToEmailStep() {
    setStep("request");
    setEmailLookupState("idle");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setCaptchaCode(generateCaptcha());
    setCaptchaInput("");
    setMessage(null);
}

  async function sendOtp() {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    setMessage({
      kind: "error",
      text: "Please enter your email address.",
    });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    setMessage({
      kind: "error",
      text: "Please enter a valid email address.",
    });
    return;
  }

  if (!captchaInput.trim()) {
    setMessage({
      kind: "error",
      text: "Please enter the captcha code.",
    });
    return;
  }

  if (captchaInput.trim().toUpperCase() !== captchaCode) {
    setEmailLookupState("idle");

    setMessage({
      kind: "error",
      text: "The captcha code is incorrect. Please try again.",
    });

    refreshCaptcha(false);
    return;
  }

  setIsBusy(true);
  setMessage(null);
  setEmailLookupState("idle");

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/forgot-password/check-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      },
    );

    const result = (await response.json().catch(() => null)) as
      | CheckEmailResponse
      | null;

    console.log("Forgot password check-email response:", {
      requestUrl: `${API_BASE_URL}/auth/forgot-password/check-email`,
      status: response.status,
      ok: response.ok,
      result,
    });

    if (!result) {
      setMessage({
        kind: "error",
        text: "The backend returned an invalid response.",
      });
      return;
    }

    if (!response.ok) {
      setMessage({
        kind: "error",
        text: result.message || "Unable to check this email address.",
      });
      return;
    }

    const accountExists =
      result.data?.exists ??
      (result.code === "account_found"
        ? true
        : result.code === "account_not_found"
          ? false
          : undefined);

    if (accountExists === false) {
      setEmailLookupState("not-found");

      setMessage({
        kind: "info",
        text: "No account is registered with this email address.",
      });

      return;
    }

    if (accountExists !== true) {
      setEmailLookupState("idle");

      setMessage({
        kind: "error",
        text: "Unable to determine whether this account exists.",
      });

      return;
    }

    setEmailLookupState("found");

    const sendOtpResponse = await fetch(
    `${API_BASE_URL}/auth/forgot-password/send-otp`,
    {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        email: normalizedEmail,
        }),
    },
    );

    const sendOtpResult = (await sendOtpResponse
    .json()
    .catch(() => null)) as SendOtpResponse | null;

    console.log("Send recovery OTP response:", {
    status: sendOtpResponse.status,
    ok: sendOtpResponse.ok,
    result: sendOtpResult,
    });

    if (!sendOtpResult) {
    setMessage({
        kind: "error",
        text: "The backend returned an invalid response while sending the OTP.",
    });
    return;
    }

    if (!sendOtpResponse.ok || sendOtpResult.code !== "otp_sent") {
    if (sendOtpResult.code === "otp_rate_limited") {
        setMessage({
        kind: "error",
        text: "An OTP was sent recently. Please wait before requesting another code.",
        });
        return;
    }

    setMessage({
        kind: "error",
        text: sendOtpResult.message || "Unable to send the verification code.",
    });
    return;
    }

    setEmail(normalizedEmail);
    setOtp("");
    setStep("verify");

    setMessage({
    kind: "success",
    text: "A real verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot-password account check failed:", error);

    setEmailLookupState("idle");

    setMessage({
      kind: "error",
      text: "Cannot connect to the backend. Please try again.",
    });
  } finally {
    setIsBusy(false);
  }
}

    async function resendOtp() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
        setMessage({
        kind: "error",
        text: "Email address is missing.",
        });
        return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
        const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/send-otp`,
        {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            email: normalizedEmail,
            }),
        },
        );

        const result = (await response
        .json()
        .catch(() => null)) as SendOtpResponse | null;

        if (!result) {
        setMessage({
            kind: "error",
            text: "The backend returned an invalid response.",
        });
        return;
        }

        if (!response.ok || result.code !== "otp_sent") {
        setMessage({
            kind: "error",
            text:
            result.code === "otp_rate_limited"
                ? "Please wait before requesting another OTP."
                : result.message || "Unable to resend the OTP.",
        });
        return;
        }

        setOtp("");

        setMessage({
        kind: "success",
        text: "A new verification code has been sent to your email.",
        });
    } catch (error) {
        console.error("Resend recovery OTP failed:", error);

        setMessage({
        kind: "error",
        text: "Cannot connect to the backend.",
        });
    } finally {
        setIsBusy(false);
    }
    }

    async function verifyOtp() {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedOtp = otp.trim();

        if (!normalizedEmail) {
            setMessage({
            kind: "error",
            text: "Email address is missing. Please restart the recovery process.",
            });
            return;
        }

        if (!normalizedOtp) {
            setMessage({
            kind: "error",
            text: "Please enter the verification code.",
            });
            return;
        }

        if (!/^\d{8}$/.test(normalizedOtp)) {
            setMessage({
            kind: "error",
            text: "The verification code must contain exactly eight digits.",
            });
            return;
        }

        setIsBusy(true);
        setMessage(null);

        try {
            const response = await fetch(
            `${API_BASE_URL}/auth/forgot-password/verify-otp`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({
                email: normalizedEmail,
                otp: normalizedOtp,
                }),
            },
            );

            const result = (await response
            .json()
            .catch(() => null)) as VerifyOtpResponse | null;

            console.log("Verify recovery OTP response:", {
            status: response.status,
            ok: response.ok,
            result,
            });

            if (!result) {
            setMessage({
                kind: "error",
                text: "The backend returned an invalid response.",
            });
            return;
            }

            if (
            response.ok &&
            result.success &&
            result.code === "otp_verified"
            ) {
            setOtp("");
            setStep("reset");

            setMessage({
                kind: "success",
                text: "Email verified successfully. You can now create a new password.",
            });

            return;
            }

            if (result.code === "invalid_or_expired_otp") {
            setMessage({
                kind: "error",
                text: "The verification code is incorrect, expired, or has already been used.",
            });
            return;
            }

            if (
            result.code === "otp_verification_rate_limited"
            ) {
            setMessage({
                kind: "error",
                text: "Too many verification attempts. Please wait before trying again.",
            });
            return;
            }

            if (result.code === "invalid_otp_format") {
            setMessage({
                kind: "error",
                text: "The verification code must contain exactly eight digits.",
            });
            return;
            }

            if (result.code === "recovery_email_mismatch") {
            setMessage({
                kind: "error",
                text: "This verification code does not belong to the current email address.",
            });
            return;
            }

            setMessage({
            kind: "error",
            text:
                result.message ||
                "Unable to verify the recovery code.",
            });
        } catch (error) {
            console.error(
            "Recovery OTP verification request failed:",
            error,
            );

            setMessage({
            kind: "error",
            text: "Cannot connect to the backend. Please try again.",
            });
        } finally {
            setIsBusy(false);
        }
        }

  async function resetPassword() {
  if (!newPassword) {
    setMessage({
      kind: "error",
      text: "Please enter your new password.",
    });
    return;
  }

  if (newPassword.length < 8) {
    setMessage({
      kind: "error",
      text: "The new password must contain at least eight characters.",
    });
    return;
  }

  if (!confirmNewPassword) {
    setMessage({
      kind: "error",
      text: "Please confirm your new password.",
    });
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setMessage({
      kind: "error",
      text: "The password confirmation does not match.",
    });
    return;
  }

  setIsBusy(true);
  setMessage(null);

  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/forgot-password/reset-password`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
          confirmNewPassword,
        }),
      },
    );

    const result = (await response
      .json()
      .catch(() => null)) as ResetPasswordResponse | null;

    console.log("Reset password response:", {
      status: response.status,
      ok: response.ok,
      result,
    });

    if (!result) {
      setMessage({
        kind: "error",
        text: "The backend returned an invalid response.",
      });
      return;
    }

    if (
      response.ok &&
      result.success &&
      result.code === "password_reset_success"
    ) {
      setNewPassword("");
      setConfirmNewPassword("");

      setMessage({
        kind: "success",
        text: "Password changed successfully. Redirecting to sign in...",
      });

      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1500);

      return;
    }

    if (result.code === "password_mismatch") {
      setMessage({
        kind: "error",
        text: "The password confirmation does not match.",
      });
      return;
    }

    if (result.code === "weak_password") {
      setMessage({
        kind: "error",
        text:
          result.message ||
          "The new password does not meet the password requirements.",
      });
      return;
    }

    if (result.code === "same_password") {
      setMessage({
        kind: "error",
        text:
          "The new password must be different from your current password.",
      });
      return;
    }

    if (
      result.code === "recovery_session_missing" ||
      result.code === "recovery_session_expired" ||
      result.code === "reauthentication_needed"
    ) {
      setMessage({
        kind: "error",
        text:
          "Your recovery session has expired. Please request and verify a new OTP.",
      });

      setStep("request");
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setEmailLookupState("idle");
      setCaptchaCode(generateCaptcha());
      setCaptchaInput("");

      return;
    }

    setMessage({
      kind: "error",
      text:
        result.message ||
        "Unable to change the password.",
    });
  } catch (error) {
    console.error("Reset password request failed:", error);

    setMessage({
      kind: "error",
      text: "Cannot connect to the backend. Please try again.",
    });
  } finally {
    setIsBusy(false);
  }
}

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === "request") {
      await sendOtp();
      return;
    }

    if (step === "verify") {
      await verifyOtp();
      return;
    }

    await resetPassword();
  }

    function getButtonText() {
    if (isBusy) {
        if (step === "request") {
        return "Checking account...";
        }

        if (step === "verify") {
        return "Verifying...";
        }

        return "Processing...";
    }

    if (step === "request") {
        return "Send OTP";
    }

    if (step === "verify") {
        return "Verify OTP";
    }

    return "Reset password";
    }
  return (
    <main className="login-page forgot-page">
      <section
        className="login-visual"
        aria-label="Gentleman's Barbershop"
      >
        <div className="login-visual__overlay" />

        <div className="brand">
          <img
            className="brand__logo"
            src="/images/logo.png"
            alt="Gentleman's Barbershop logo"
          />

          <div className="brand__copy">
            <span>GENTLEMAN&apos;S BARBERSHOP</span>
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

      <section className="login-panel forgot-panel">
        <div className="login-card forgot-card">
          <header className="login-card__header forgot-card__header">
            <div className="ornament" aria-hidden="true">
              <span />
              <b>◆</b>
              <span />
            </div>

            <p className="eyebrow">{headerContent.eyebrow}</p>
            <h1>{headerContent.title}</h1>
            <p>{headerContent.description}</p>
          </header>

          <div className="forgot-progress" aria-label="Password reset progress">
            <div
              className={`forgot-progress__item ${
                step === "request" ? "is-current" : "is-complete"
              }`}
            >
              <span>1</span>
              <small>Email</small>
            </div>

            <div
              className={`forgot-progress__line ${
                step !== "request" ? "is-complete" : ""
              }`}
            />

            <div
              className={`forgot-progress__item ${
                step === "verify"
                  ? "is-current"
                  : step === "reset"
                    ? "is-complete"
                    : ""
              }`}
            >
              <span>2</span>
              <small>OTP</small>
            </div>

            <div
              className={`forgot-progress__line ${
                step === "reset" ? "is-complete" : ""
              }`}
            />

            <div
              className={`forgot-progress__item ${
                step === "reset" ? "is-current" : ""
              }`}
            >
              <span>3</span>
              <small>Password</small>
            </div>
          </div>

          <form
            className="login-form forgot-password-form"
            onSubmit={handleSubmit}
          >
            <div className="form-field">
              <div className="forgot-field-heading">
                <label htmlFor="forgot-email">Email address</label>

                {step !== "request" && (
                  <button
                    className="forgot-text-button"
                    type="button"
                    onClick={resetToEmailStep}
                  >
                    Change email
                  </button>
                )}
              </div>

              <div
                className={`input-shell ${
                  step !== "request" ? "forgot-input-shell--disabled" : ""
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3.5 5.5h17v13h-17z" />
                  <path d="m4.5 7 7.5 6 7.5-6" />
                </svg>

                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={email}
                  disabled={step !== "request"}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailLookupState("idle");
                    setMessage(null);
                  }}
                  required
                />

                {step !== "request" && (
                  <svg
                    className="forgot-input-status"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8 12 2.6 2.6L16.5 9" />
                  </svg>
                )}
              </div>
            </div>

            {step === "request" && (
              <div className="form-field forgot-stage">
                <label htmlFor="captcha">Security verification</label>

                <div className="forgot-captcha">
                  <div
                    className="forgot-captcha__code"
                    aria-label={`Captcha code: ${captchaCode}`}
                  >
                    {captchaCode.split("").map((character, index) => (
                      <span key={`${character}-${index}`}>{character}</span>
                    ))}
                  </div>

                  <button
                    className="forgot-captcha__refresh"
                    type="button"
                    aria-label="Generate a new captcha"
                    title="Generate a new captcha"
                    onClick={() => refreshCaptcha()}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 6v5h-5" />
                      <path d="M19 11a7.5 7.5 0 1 0 .2 5.4" />
                    </svg>
                  </button>
                </div>

                <div className="input-shell">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>

                  <input
                    id="captcha"
                    name="captcha"
                    type="text"
                    autoComplete="off"
                    placeholder="Enter the code shown above"
                    value={captchaInput}
                    maxLength={6}
                    onChange={(event) =>
                      setCaptchaInput(event.target.value.toUpperCase())
                    }
                    required
                  />
                </div>

                <p className="forgot-field-caption">
                  The captcha is not case-sensitive.
                </p>
              </div>
            )}

            {step === "verify" && (
              <div className="forgot-stage">
                <div className="forgot-otp-notice">
                  <div className="forgot-otp-notice__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 6h16v12H4z" />
                      <path d="m5 7 7 6 7-6" />
                    </svg>
                  </div>

                  <div>
                    <strong>Check your inbox</strong>
                    <p>
                      Enter the code sent to <span>{email}</span>
                    </p>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="otp">Verification code</label>

                  <div className="input-shell forgot-otp-shell">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="8" cy="12" r="4" />
                      <path d="M12 12h9M18 12v3M15 12v2" />
                    </svg>

                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="00000000"
                      value={otp}
                      maxLength={8}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, ""))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="forgot-otp-options">
                  <span>Didn&apos;t receive the code?</span>

                  <button
                    className="forgot-text-button"
                    type="button"
                    disabled={isBusy}
                    onClick={resendOtp}
                  >
                    Resend OTP
                  </button>
                </div>
              </div>
            )}

            {step === "reset" && (
              <div className="forgot-stage forgot-password-stage">
                <div className="forgot-verified">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8 12 2.6 2.6L16.5 9" />
                  </svg>

                  <div>
                    <strong>Verification successful</strong>
                    <p>Your identity has been confirmed.</p>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="new-password">New password</label>

                  <div className="input-shell">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="5.5"
                        y="10"
                        width="13"
                        height="10"
                        rx="1.5"
                      />
                      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                    </svg>

                    <input
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      minLength={8}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />

                    <button
                      className="password-toggle"
                      type="button"
                      aria-label={
                        showNewPassword
                          ? "Hide new password"
                          : "Show new password"
                      }
                      onClick={() =>
                        setShowNewPassword((current) => !current)
                      }
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="confirm-new-password">
                    Confirm new password
                  </label>

                  <div className="input-shell">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="5.5"
                        y="10"
                        width="13"
                        height="10"
                        rx="1.5"
                      />
                      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
                    </svg>

                    <input
                      id="confirm-new-password"
                      name="confirmNewPassword"
                      type={showConfirmNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter the new password again"
                      value={confirmNewPassword}
                      minLength={8}
                      onChange={(event) =>
                        setConfirmNewPassword(event.target.value)
                      }
                      required
                    />

                    <button
                      className="password-toggle"
                      type="button"
                      aria-label={
                        showConfirmNewPassword
                          ? "Hide password confirmation"
                          : "Show password confirmation"
                      }
                      onClick={() =>
                        setShowConfirmNewPassword((current) => !current)
                      }
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {step === "request" && emailLookupState === "not-found" && (
                <div className="forgot-signup-prompt">
                    <div className="forgot-signup-prompt__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4.5 20c.8-4 3.2-6 7.5-6s6.7 2 7.5 6" />
                        <path d="M19 6v6M16 9h6" />
                    </svg>
                    </div>

                    <div className="forgot-signup-prompt__content">
                    <strong>No account found</strong>

                    <p>
                        We could not find an account registered with{" "}
                        <span>{email.trim()}</span>.
                    </p>

                    <Link className="forgot-signup-prompt__button" to="/register">
                        Proceed to sign up

                        <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="m14 7 5 5-5 5" />
                        </svg>
                    </Link>
                    </div>
                </div>
                )}
            {message && (
              <div
                className={`forgot-message forgot-message--${message.kind}`}
                role={message.kind === "error" ? "alert" : "status"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {message.kind === "error" ? (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5v6M12 17h.01" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8 12 2.6 2.6L16.5 9" />
                    </>
                  )}
                </svg>

                <span>{message.text}</span>
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={isBusy}
            >
              {getButtonText()}
            </button>
          </form>

          <p className="signup-copy forgot-back-link">
            Remember your password? <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}