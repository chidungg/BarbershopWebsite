const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/$/, '');

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type PublicService = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  displayOrder: number;
};

export type PublicServiceCategory = {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
};

export type PublicBarber = {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  experienceYears: number;
  ratingAverage: number;
  reviewCount: number;
};

export type ShopDetails = {
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
};

export type HomeContent = {
  services: PublicService[];
  barbers: PublicBarber[];
  shop: ShopDetails;
};

export type ServicesCatalog = {
  shopName: string;
  categories: PublicServiceCategory[];
  services: PublicService[];
};

async function getPublicData<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? 'Unable to load data from the server.');
  }

  return payload.data;
}

export function fetchHomeContent(signal?: AbortSignal) {
  return getPublicData<HomeContent>('/public/home', signal);
}

export function fetchServicesCatalog(signal?: AbortSignal) {
  return getPublicData<ServicesCatalog>('/public/services', signal);
}
