import { useEffect, useRef, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import Carousel from 'bootstrap/js/dist/carousel';
import { fetchHomeContent, type HomeContent } from '../../shared/httpClient';
import SiteHeader from '../../shared/SiteHeader';
import './HomePage.css';

const fallbackServiceImage = '/images/background.png';
const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function HomePage() {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [loadError, setLoadError] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(
    () => new URLSearchParams(window.location.search).get('service') ?? '',
  );
  const carouselRef = useRef<HTMLDivElement>(null);

  const services = content?.services ?? [];
  const featuredServices = services.slice(0, 3);
  const barbers = content?.barbers ?? [];
  const shop = content?.shop;

  useEffect(() => {
    const controller = new AbortController();

    fetchHomeContent(controller.signal)
      .then((data) => {
        setContent(data);
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load shop data.',
        );
      });

    return () => controller.abort();
  }, []);

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
  }, [featuredServices.length]);

  function submitQuickBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedService = services.find(
      (service) => service.id === selectedServiceId,
    );
    setBookingMessage(
      selectedService
        ? `Continue to choose an available time for ${selectedService.name}.`
        : 'Choose a time that works for you in the next booking step.',
    );
  }

  return (
    <main className="home-page">
      <SiteHeader brandName={shop?.name} />

      {loadError && (
        <div className="home-data-alert" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

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
                aria-label={`Slide ${index + 1}: ${service.name}`}
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
                  className="d-block w-100 carousel-image"
                  src={service.imageUrl ?? fallbackServiceImage}
                  alt={service.name}
                />
                <div className="carousel-shade" />
                <div className="carousel-caption hero-content page-shell">
                  <p className="carousel-kicker">{service.categoryName}</p>
                  <h1>{service.name}</h1>
                  <p className="carousel-description">{service.description}</p>
                  <p className="service-meta">
                    <span>{service.durationMinutes} min</span>
                    <i>•</i>
                    <strong>{priceFormatter.format(service.price)}</strong>
                  </p>
                  <div className="hero-actions">
                    <a
                      className="button button--gold"
                      href={`/?service=${service.id}#booking`}
                    >
                      Book this service
                    </a>
                    <a className="button button--ghost" href="/services">
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
        {!content && !loadError && (
          <div className="home-data-loading" role="status">
            Loading services…
          </div>
        )}
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
            <select
              value={selectedServiceId}
              required
              onChange={(event) => setSelectedServiceId(event.target.value)}
            >
              <option value="" disabled>
                Select a service
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Barber
            <select defaultValue="">
              <option value="">No preference</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
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
          {services.slice(0, 3).map((service, index) => (
            <article className="service-card" key={service.id}>
              <span className="service-card__number">0{index + 1}</span>
              <span className="service-card__icon" aria-hidden="true">
                ✦
              </span>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <footer>
                <span>{service.durationMinutes} min</span>
                <strong>{priceFormatter.format(service.price)}</strong>
              </footer>
              <a
                href={`/?service=${service.id}#booking`}
                aria-label={`Book ${service.name}`}
              >
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
            {barbers.map((barber) => (
              <article className="barber-card" key={barber.id}>
                <div
                  className="barber-card__portrait"
                  aria-hidden="true"
                  style={
                    barber.avatarUrl
                      ? {
                          backgroundImage: `linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.4)), url("${barber.avatarUrl}")`,
                        }
                      : undefined
                  }
                >
                  <span>{getInitials(barber.name)}</span>
                </div>
                <div>
                  <p>{barber.experienceYears} years of experience</p>
                  <h3>{barber.name}</h3>
                  <span>{barber.bio}</span>
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
          {shop && (
            <div className="visit-card">
              <p>{shop.name}</p>
              <address>{shop.address}</address>
              <div>
                <span>{shop.email}</span>
                <strong>{shop.timezone}</strong>
              </div>
              <a href={`tel:${shop.phone.replace(/\s+/g, '')}`}>
                {shop.phone} <span>→</span>
              </a>
            </div>
          )}
        </div>
      </section>

      <footer className="site-footer page-shell">
        <a className="site-brand" href="#top">
          <img src="/images/logo.png" alt="" />
          <span>
            {shop?.name}
            <small>PREMIUM GROOMING</small>
          </span>
        </a>
        <p>Considered appointments. Confident style.</p>
        <span>
          © {new Date().getFullYear()} {shop?.name}
        </span>
      </footer>
    </main>
  );
}
