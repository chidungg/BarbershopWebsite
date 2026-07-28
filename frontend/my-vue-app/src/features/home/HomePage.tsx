import { useEffect, useRef, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import Carousel from 'bootstrap/js/dist/carousel';
import './HomePage.css';
import { barbers, featuredServices, services } from './home.data';

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!carouselRef.current) return;

    const carousel = Carousel.getOrCreateInstance(carouselRef.current, {
      interval: 5500,
      pause: 'hover',
      ride: 'carousel',
      touch: true,
    });

    carousel.cycle();
    return () => carousel.dispose();
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function submitQuickBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingMessage(
      'Choose a time that works for you in the next booking step.',
    );
  }

  return (
    <main className="home-page">
      <header className="site-header">
        <a
          className="site-brand"
          href="#top"
          aria-label="Gentleman's Barbershop home"
        >
          <img src="/images/logo.png" alt="Gentleman's Barbershop" />
          <span>
            GENTLEMAN&apos;S BARBERSHOP
            <small>PREMIUM GROOMING</small>
          </span>
        </a>

        <button
          className="menu-button"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
          <span className="sr-only">Toggle navigation</span>
        </button>

        <nav
          id="site-navigation"
          className={isMenuOpen ? 'site-nav is-open' : 'site-nav'}
        >
          <a href="#top" onClick={closeMenu}>
            Home
          </a>
          <a href="#services" onClick={closeMenu}>
            Services
          </a>
          <a href="#barbers" onClick={closeMenu}>
            Barbers
          </a>
          <a href="#gallery" onClick={closeMenu}>
            Gallery
          </a>
          <a href="#visit" onClick={closeMenu}>
            Visit us
          </a>
        </nav>

        <div className="header-actions">
          <a className="sign-in-link" href="/login">
            Sign in
          </a>
          <a className="button button--gold button--small" href="#booking">
            Book now
          </a>
        </div>
      </header>

      <section
        id="top"
        className="hero-carousel"
        aria-label="Featured services"
      >
        <div
          ref={carouselRef}
          id="barbershopCarousel"
          className="carousel slide carousel-fade"
          data-bs-ride="carousel"
          data-bs-interval="5500"
        >
          <div className="carousel-indicators">
            {featuredServices.map((service, index) => (
              <button
                key={service.id}
                type="button"
                data-bs-target="#barbershopCarousel"
                data-bs-slide-to={index}
                className={index === 0 ? 'active' : undefined}
                aria-current={index === 0 ? 'true' : undefined}
                aria-label={`Slide ${index + 1}: ${service.title}`}
              />
            ))}
          </div>

          <div className="carousel-inner">
            {featuredServices.map((service, index) => (
              <div
                className={`carousel-item ${index === 0 ? 'active' : ''}`}
                key={service.id}
              >
                <img
                  className={`d-block w-100 carousel-image carousel-image--${service.id}`}
                  src={service.image}
                  alt=""
                />
                <div className="carousel-shade" />
                <div className="carousel-caption hero-content page-shell">
                  <p className="carousel-kicker">{service.eyebrow}</p>
                  <h1>{service.title}</h1>
                  <p className="carousel-description">{service.description}</p>
                  <p className="service-meta">
                    <span>{service.duration}</span>
                    <i>•</i>
                    <strong>{service.price}</strong>
                  </p>
                  <div className="hero-actions">
                    <a className="button button--gold" href="#booking">
                      Book this service
                    </a>
                    <a className="button button--ghost" href="#services">
                      View all services <span>→</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="carousel-control-prev"
            type="button"
            data-bs-target="#barbershopCarousel"
            data-bs-slide="prev"
          >
            <span className="carousel-control-prev-icon" aria-hidden="true" />
            <span className="visually-hidden">Previous</span>
          </button>
          <button
            className="carousel-control-next"
            type="button"
            data-bs-target="#barbershopCarousel"
            data-bs-slide="next"
          >
            <span className="carousel-control-next-icon" aria-hidden="true" />
            <span className="visually-hidden">Next</span>
          </button>
        </div>
      </section>

      <section
        id="booking"
        className="quick-booking page-shell"
        aria-labelledby="booking-title"
      >
        <div className="quick-booking__intro">
          <p className="eyebrow">QUICK BOOKING</p>
          <h2 id="booking-title">Find your time.</h2>
        </div>
        <form className="booking-form" onSubmit={submitQuickBooking}>
          <label>
            Service
            <select defaultValue="" required>
              <option value="" disabled>
                Select a service
              </option>
              {services.map((service) => (
                <option key={service.name}>{service.name}</option>
              ))}
            </select>
          </label>
          <label>
            Barber
            <select defaultValue="">
              <option value="">No preference</option>
              {barbers.map((barber) => (
                <option key={barber.name}>{barber.name}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" required />
          </label>
          <button className="button button--dark" type="submit">
            Find availability <span>→</span>
          </button>
        </form>
        {bookingMessage && (
          <p className="booking-message" role="status">
            {bookingMessage}
          </p>
        )}
      </section>

      <section id="services" className="section page-shell services-section">
        <div className="section-heading">
          <p className="eyebrow">FEATURED SERVICES</p>
          <h2>
            Cut. Shape.
            <br />
            <em>Finish.</em>
          </h2>
        </div>
        <div className="service-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.name}>
              <span className="service-card__number">0{index + 1}</span>
              <span className="service-card__icon" aria-hidden="true">
                {service.icon}
              </span>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <footer>
                <span>{service.duration}</span>
                <strong>{service.price}</strong>
              </footer>
              <a href="#booking" aria-label={`Book ${service.name}`}>
                Book now <span>→</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="barbers" className="barbers-section">
        <div className="page-shell barbers-section__inner">
          <div className="section-heading section-heading--light">
            <p className="eyebrow eyebrow--light">OUR BARBERS</p>
            <h2>
              Masters of
              <br />
              your best look.
            </h2>
            <p className="section-lead">
              Every barber listens, advises and refines a look that feels like
              yours.
            </p>
          </div>
          <div className="barber-grid">
            {barbers.map((barber, index) => (
              <article className="barber-card" key={barber.name}>
                <div
                  className={`barber-card__portrait barber-card__portrait--${index + 1}`}
                  aria-hidden="true"
                >
                  <span>{barber.initials}</span>
                </div>
                <div>
                  <p>Master barber</p>
                  <h3>{barber.name}</h3>
                  <span>{barber.specialty}</span>
                </div>
                <a
                  href="#booking"
                  aria-label={`View ${barber.name}'s availability`}
                >
                  View availability <span>→</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section page-shell process-section">
        <div className="section-heading">
          <p className="eyebrow">EFFORTLESS BOOKING</p>
          <h2>
            Three steps to
            <br />
            <em>your next look.</em>
          </h2>
        </div>
        <ol className="process-list">
          <li>
            <span>01</span>
            <div>
              <h3>Choose your service</h3>
              <p>Start with the grooming experience that fits what you need.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Pick your barber and time</h3>
              <p>
                See live availability, then choose your barber and preferred
                time.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Arrive with confidence</h3>
              <p>From consultation to finish, we will take care of the rest.</p>
            </div>
          </li>
        </ol>
      </section>

      <section id="gallery" className="gallery-section page-shell">
        <div className="gallery-intro">
          <p className="eyebrow">SPACE & STYLE</p>
          <h2>
            Made for
            <br />
            <em>your ritual.</em>
          </h2>
        </div>
        <div className="gallery-grid">
          <figure className="gallery-grid__main">
            <img
              src="/images/carousel/signature-cut.png"
              alt="A barber completing a client's haircut"
            />
            <figcaption>Precision in every cut</figcaption>
          </figure>
          <figure className="gallery-grid__chair">
            <img
              src="/images/background.png"
              alt="Warm barbershop interior and classic chair"
            />
            <figcaption>A moment made for you</figcaption>
          </figure>
          <blockquote>
            “A great cut changes more than your look. It elevates your
            confidence.”<cite>— GENTLEMAN&apos;S BARBERSHOP</cite>
          </blockquote>
        </div>
      </section>

      <section id="visit" className="visit-section">
        <div className="page-shell visit-section__inner">
          <div className="visit-section__copy">
            <p className="eyebrow eyebrow--light">VISIT THE SHOP</p>
            <h2>
              Your favourite chair
              <br />
              is waiting.
            </h2>
            <a className="button button--gold" href="#booking">
              Book an appointment
            </a>
          </div>
          <div className="visit-card">
            <p>Gentleman&apos;s Barbershop</p>
            <address>
              123 Nguyen Van Cu Street
              <br />
              District 5, Ho Chi Minh City
            </address>
            <div>
              <span>Monday — Sunday</span>
              <strong>09:00 — 20:30</strong>
            </div>
            <a href="tel:+84900000000">
              +84 900 000 000 <span>→</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer page-shell">
        <a className="site-brand" href="#top">
          <img src="/images/logo.png" alt="" />
          <span>
            GENTLEMAN&apos;S BARBERSHOP<small>PREMIUM GROOMING</small>
          </span>
        </a>
        <p>Considered appointments. Confident style.</p>
        <span>© 2026 Gentleman&apos;s Barbershop</span>
      </footer>
    </main>
  );
}
