import { Link, useNavigate } from "react-router-dom";
import "./404.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="not-found-page">
      <div className="not-found-glow not-found-glow--left" />
      <div className="not-found-glow not-found-glow--right" />

      <section className="not-found-card">
        <div className="not-found-visual" aria-hidden="true">
          <span className="not-found-number not-found-number--left">4</span>

          <div className="not-found-emblem">
            <div className="not-found-emblem__ring">
              <svg
                className="not-found-scissors"
                viewBox="0 0 120 120"
                role="img"
                aria-label="Barbershop scissors"
              >
                <circle cx="31" cy="87" r="15" />
                <circle cx="89" cy="87" r="15" />
                <path d="M42 77 91 26" />
                <path d="M78 77 29 26" />
                <path d="M50 69 29 90" />
                <path d="M70 69 91 90" />
                <circle cx="60" cy="61" r="5" />
              </svg>
            </div>
          </div>

          <span className="not-found-number not-found-number--right">4</span>
        </div>

        <div className="not-found-divider">
          <span />
          <strong>Gentleman&apos;s Barbershop</strong>
          <span />
        </div>

        <div className="not-found-content">
          <p className="not-found-eyebrow">Page not found</p>

          <h1>This page needs a fresh cut.</h1>

          <p className="not-found-description">
            The page you are looking for may have been moved, removed or never
            existed. Return to the homepage and continue your barbershop
            experience.
          </p>

          <div className="not-found-actions">
            <Link className="not-found-button not-found-button--primary" to="/">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10v10h13V10" />
                <path d="M9.5 20v-6h5v6" />
              </svg>

              <span>Back to homepage</span>
            </Link>

            <button
              className="not-found-button not-found-button--secondary"
              type="button"
              onClick={() => navigate(-1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m10 6-6 6 6 6" />
                <path d="M4 12h16" />
              </svg>

              <span>Go back</span>
            </button>
          </div>
        </div>

        <div className="not-found-footer">
          <span>404</span>
          <p>Precision. Style. Confidence.</p>
          <span>404</span>
        </div>
      </section>
    </main>
  );
}