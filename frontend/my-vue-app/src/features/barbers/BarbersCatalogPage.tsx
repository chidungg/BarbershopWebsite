import { useEffect, useMemo, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {
  fetchBarbersCatalog,
  type BarbersCatalog,
  type PublicBarberProfile,
} from '../../shared/httpClient';
import SiteHeader from '../../shared/SiteHeader';
import './BarbersCatalogPage.css';

const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const weekdayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function getDateDetails(timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.weekday,
  );

  return {
    dayOfWeek,
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function getTodaySchedule(barber: PublicBarberProfile, timezone: string) {
  const { dayOfWeek, isoDate } = getDateDetails(timezone);

  return barber.schedules.find(
    (schedule) =>
      schedule.dayOfWeek === dayOfWeek &&
      schedule.validFrom <= isoDate &&
      (!schedule.validTo || schedule.validTo >= isoDate),
  );
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

export default function BarbersCatalogPage() {
  const [catalog, setCatalog] = useState<BarbersCatalog | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [sort, setSort] = useState('recommended');
  const [selectedBarber, setSelectedBarber] =
    useState<PublicBarberProfile | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchBarbersCatalog(controller.signal)
      .then((data) => {
        setCatalog(data);
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load barbers.',
        );
      });

    return () => controller.abort();
  }, []);

  const specialties = useMemo(
    () =>
      [
        ...new Set(
          (catalog?.barbers ?? []).flatMap((barber) => barber.specialties),
        ),
      ].sort(),
    [catalog],
  );

  const visibleBarbers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const result = (catalog?.barbers ?? []).filter((barber) => {
      const matchesSearch =
        !normalizedSearch ||
        barber.name.toLowerCase().includes(normalizedSearch) ||
        barber.bio.toLowerCase().includes(normalizedSearch) ||
        barber.specialties.some((item) =>
          item.toLowerCase().includes(normalizedSearch),
        );
      const matchesSpecialty =
        specialty === 'all' || barber.specialties.includes(specialty);

      return matchesSearch && matchesSpecialty;
    });

    return [...result].sort((left, right) => {
      if (sort === 'experience')
        return right.experienceYears - left.experienceYears;
      if (sort === 'rating') return right.ratingAverage - left.ratingAverage;
      return (
        right.reviewCount - left.reviewCount ||
        right.ratingAverage - left.ratingAverage
      );
    });
  }, [catalog, search, sort, specialty]);

  return (
    <main className="barbers-catalog-page">
      <SiteHeader currentPage="barbers" brandName={catalog?.shopName} />

      <section className="container barbers-content" aria-label="Barber list">
        <div className="barbers-toolbar row g-3 align-items-end">
          <div className="col-lg">
            <p>{catalog ? `${visibleBarbers.length} BARBERS` : 'OUR TEAM'}</p>
            <h2>Meet the team</h2>
          </div>
          <div className="col-lg-4">
            <div className="input-group">
              <span className="input-group-text" aria-hidden="true">
                ⌕
              </span>
              <input
                className="form-control"
                type="search"
                value={search}
                placeholder="Search barbers"
                aria-label="Search barbers"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="col-sm-6 col-lg-2">
            <select
              className="form-select"
              value={specialty}
              aria-label="Filter by specialty"
              onChange={(event) => setSpecialty(event.target.value)}
            >
              <option value="all">All specialties</option>
              {specialties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-6 col-lg-2">
            <select
              className="form-select"
              value={sort}
              aria-label="Sort barbers"
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="experience">Most experienced</option>
            </select>
          </div>
        </div>

        {loadError ? (
          <div className="barbers-empty" role="alert">
            <h3>Barbers are unavailable</h3>
            <p>{loadError}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : !catalog ? (
          <div className="barbers-empty" role="status">
            <h3>Loading barbers</h3>
          </div>
        ) : visibleBarbers.length ? (
          <div className="row g-4">
            {visibleBarbers.map((barber) => {
              const todaySchedule = getTodaySchedule(barber, catalog.timezone);

              return (
                <div className="col-12 col-xl-6" key={barber.id}>
                  <article className="barber-profile-card h-100">
                    <img
                      src={barber.avatarUrl ?? '/images/background.png'}
                      alt={barber.name}
                    />
                    <div className="barber-profile-card__content">
                      <p className="barber-profile-card__schedule">
                        {todaySchedule
                          ? `TODAY · ${formatTime(todaySchedule.startTime)}–${formatTime(todaySchedule.endTime)}`
                          : 'DAY OFF TODAY'}
                      </p>
                      <h3>{barber.name}</h3>
                      <span className="barber-profile-card__experience">
                        {barber.experienceYears} years experience
                      </span>
                      <div className="barber-profile-card__rating">
                        {barber.reviewCount > 0 ? (
                          <>
                            <strong>★ {barber.ratingAverage.toFixed(1)}</strong>
                            <span>
                              {barber.reviewCount}{' '}
                              {barber.reviewCount === 1 ? 'review' : 'reviews'}
                            </span>
                          </>
                        ) : (
                          <>
                            <strong>NEW</strong>
                            <span>No reviews yet</span>
                          </>
                        )}
                      </div>
                      <div className="barber-specialties">
                        {barber.specialties.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                      <p className="barber-profile-card__bio">{barber.bio}</p>
                      <div className="barber-profile-card__actions">
                        <button
                          type="button"
                          onClick={() => setSelectedBarber(barber)}
                        >
                          View profile
                        </button>
                        <a href={`/?barber=${barber.id}#booking`}>
                          Book with {barber.name.split(' ')[0]}
                        </a>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="barbers-empty">
            <h3>No barbers found</h3>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSpecialty('all');
              }}
            >
              View all barbers
            </button>
          </div>
        )}
      </section>

      {selectedBarber && catalog && (
        <div
          className="barber-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="barber-modal-title"
        >
          <button
            className="barber-modal__backdrop"
            type="button"
            aria-label="Close barber profile"
            onClick={() => setSelectedBarber(null)}
          />
          <div className="barber-modal__dialog">
            <button
              className="barber-modal__close"
              type="button"
              aria-label="Close barber profile"
              onClick={() => setSelectedBarber(null)}
            >
              ×
            </button>
            <div className="barber-modal__header">
              <img
                src={selectedBarber.avatarUrl ?? '/images/background.png'}
                alt={selectedBarber.name}
              />
              <div>
                <p>BARBER PROFILE</p>
                <h2 id="barber-modal-title">{selectedBarber.name}</h2>
                <span>{selectedBarber.bio}</span>
              </div>
            </div>
            <div className="barber-modal__body">
              <section>
                <p>SERVICES</p>
                <div className="barber-service-list">
                  {selectedBarber.services.map((service) => (
                    <div key={service.id}>
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.durationMinutes} min</small>
                      </span>
                      <b>{priceFormatter.format(service.price)}</b>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <p>REGULAR HOURS</p>
                <div className="barber-hours-list">
                  {weekdayNames.map((day, dayOfWeek) => {
                    const schedule = selectedBarber.schedules.find(
                      (item) => item.dayOfWeek === dayOfWeek,
                    );

                    return (
                      <div key={day}>
                        <span>{day}</span>
                        <strong>
                          {schedule
                            ? `${formatTime(schedule.startTime)}–${formatTime(schedule.endTime)}`
                            : 'Closed'}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <a
              className="barber-modal__book"
              href={`/?barber=${selectedBarber.id}#booking`}
            >
              Book with {selectedBarber.name.split(' ')[0]}
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
