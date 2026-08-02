import { useEffect, useMemo, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import {
  fetchServicesCatalog,
  type PublicService,
  type ServicesCatalog,
} from '../../shared/httpClient';
import SiteHeader from '../../shared/SiteHeader';
import './ServicesCatalogPage.css';

const PAGE_SIZE = 6;
const fallbackServiceImage = '/images/background.png';

const priceFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export default function ServicesCatalogPage() {
  const [catalog, setCatalog] = useState<ServicesCatalog | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('catalog');
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PublicService | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchServicesCatalog(controller.signal)
      .then((data) => {
        setCatalog(data);
        setLoadError('');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load services.',
        );
      });

    return () => controller.abort();
  }, []);

  const serviceCategories = catalog?.categories ?? [];
  const catalogServices = catalog?.services ?? [];

  const filteredServices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const result = catalogServices.filter((service) => {
      const categoryMatches =
        selectedCategory === 'all' || service.categoryId === selectedCategory;
      const searchMatches =
        !normalizedSearch ||
        service.name.toLowerCase().includes(normalizedSearch) ||
        service.description.toLowerCase().includes(normalizedSearch) ||
        service.categoryName.toLowerCase().includes(normalizedSearch);

      return categoryMatches && searchMatches;
    });

    return [...result].sort((left, right) => {
      if (sort === 'price-low') return left.price - right.price;
      if (sort === 'price-high') return right.price - left.price;
      if (sort === 'duration')
        return left.durationMinutes - right.durationMinutes;
      return (
        left.displayOrder - right.displayOrder ||
        left.name.localeCompare(right.name)
      );
    });
  }, [catalogServices, search, selectedCategory, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredServices.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleServices = filteredServices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedCategoryName =
    serviceCategories.find((category) => category.id === selectedCategory)
      ?.name ?? 'All services';

  function chooseCategory(categoryId: string) {
    setSelectedCategory(categoryId);
    setPage(1);
    setIsFilterOpen(false);
  }

  return (
    <main className="services-catalog-page">
      <SiteHeader currentPage="services" brandName={catalog?.shopName} />

      <section
        className="container catalog-content"
        aria-labelledby="service-list-title"
      >
        <div className="row g-4 g-xl-5">
          <aside
            className={`col-lg-3 catalog-sidebar-column ${isFilterOpen ? 'is-open' : ''}`}
          >
            <div className="catalog-sidebar position-lg-sticky">
              <div className="catalog-sidebar__heading">
                <div>
                  <p>EXPLORE</p>
                  <h2>Categories</h2>
                </div>
                <button
                  className="catalog-sidebar__close d-lg-none"
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  aria-label="Close categories"
                >
                  ×
                </button>
              </div>

              <button
                className={`catalog-category-all ${selectedCategory === 'all' ? 'is-active' : ''}`}
                type="button"
                onClick={() => chooseCategory('all')}
              >
                <span>All services</span>
                <small>{catalogServices.length}</small>
              </button>

              <div className="catalog-category-tree">
                {serviceCategories.map((category) => {
                  const categoryCount = catalogServices.filter(
                    (service) => service.categoryId === category.id,
                  ).length;

                  return (
                    <div className="catalog-category-group" key={category.id}>
                      <button
                        className={`catalog-category-parent ${selectedCategory === category.id ? 'is-active' : ''}`}
                        type="button"
                        onClick={() => chooseCategory(category.id)}
                      >
                        <span>{category.name}</span>
                        <span className="catalog-category-parent__meta">
                          <small>{categoryCount}</small>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {isFilterOpen && (
            <button
              className="catalog-filter-backdrop d-lg-none"
              type="button"
              aria-label="Close categories"
              onClick={() => setIsFilterOpen(false)}
            />
          )}

          <div className="col-lg-9">
            <div className="catalog-toolbar">
              <div>
                <p>SERVICE MENU</p>
                <h2 id="service-list-title">{selectedCategoryName}</h2>
              </div>

              <button
                className="btn catalog-filter-button d-lg-none"
                type="button"
                onClick={() => setIsFilterOpen(true)}
              >
                Categories
              </button>
            </div>

            <div className="catalog-controls row g-2">
              <div className="col-sm">
                <div className="input-group">
                  <span className="input-group-text" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    className="form-control"
                    type="search"
                    value={search}
                    placeholder="Search services"
                    aria-label="Search services"
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
              <div className="col-sm-auto">
                <select
                  className="form-select"
                  value={sort}
                  aria-label="Sort services"
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="catalog">Catalog order</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="duration">Shortest first</option>
                </select>
              </div>
            </div>

            <div className="catalog-result-meta">
              <span>
                {catalog
                  ? `${filteredServices.length} services`
                  : 'Loading services…'}
              </span>
              {selectedCategory !== 'all' && (
                <button type="button" onClick={() => chooseCategory('all')}>
                  Clear filter
                </button>
              )}
            </div>

            {loadError ? (
              <div className="catalog-empty" role="alert">
                <span>!</span>
                <h3>Services are unavailable</h3>
                <p>{loadError}</p>
                <button type="button" onClick={() => window.location.reload()}>
                  Try again
                </button>
              </div>
            ) : !catalog ? (
              <div className="catalog-empty" role="status">
                <span>✦</span>
                <h3>Loading services</h3>
              </div>
            ) : visibleServices.length > 0 ? (
              <div className="row g-3 g-xl-4">
                {visibleServices.map((service) => (
                  <div className="col-md-6" key={service.id}>
                    <article className="card catalog-service-card h-100">
                      <div className="catalog-service-card__image-wrap">
                        <img
                          className="card-img-top"
                          src={service.imageUrl ?? fallbackServiceImage}
                          alt={service.name}
                        />
                        <span>{service.categoryName}</span>
                      </div>

                      <div className="card-body">
                        <h3 className="card-title">{service.name}</h3>
                        <p className="card-text">{service.description}</p>
                        <div className="catalog-service-card__meta">
                          <span>{service.durationMinutes} min</span>
                          <strong>
                            {priceFormatter.format(service.price)}
                          </strong>
                        </div>
                      </div>

                      <div className="card-footer">
                        <button
                          className="btn catalog-detail-button"
                          type="button"
                          onClick={() => setSelectedService(service)}
                        >
                          Details
                        </button>
                        <a
                          className="btn catalog-card-book-button"
                          href={`/?service=${service.id}#booking`}
                        >
                          Book now
                        </a>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            ) : (
              <div className="catalog-empty">
                <span>✦</span>
                <h3>No services found</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    chooseCategory('all');
                  }}
                >
                  View all services
                </button>
              </div>
            )}

            {catalog && totalPages > 1 && (
              <nav
                className="catalog-pagination"
                aria-label="Services pagination"
              >
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>

      {selectedService && (
        <div
          className="catalog-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
        >
          <button
            className="catalog-modal__backdrop"
            type="button"
            aria-label="Close service details"
            onClick={() => setSelectedService(null)}
          />
          <div className="catalog-modal__dialog">
            <img
              src={selectedService.imageUrl ?? fallbackServiceImage}
              alt={selectedService.name}
            />
            <div className="catalog-modal__content">
              <button
                className="catalog-modal__close"
                type="button"
                aria-label="Close service details"
                onClick={() => setSelectedService(null)}
              >
                ×
              </button>
              <p>{selectedService.categoryName}</p>
              <h2 id="service-modal-title">{selectedService.name}</h2>
              <span>{selectedService.description}</span>
              <div>
                <small>
                  Duration<strong>{selectedService.durationMinutes} min</strong>
                </small>
                <small>
                  Price
                  <strong>
                    {priceFormatter.format(selectedService.price)}
                  </strong>
                </small>
              </div>
              <a
                className="btn catalog-card-book-button"
                href={`/?service=${selectedService.id}#booking`}
              >
                Book this service
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
