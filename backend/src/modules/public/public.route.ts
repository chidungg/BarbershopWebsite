import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { supabase } from "../../lib/supabase";

export const publicRouter = Router();

const serviceFields = `
  id,
  category_id,
  name,
  description,
  base_price,
  duration_minutes,
  image_url,
  display_order,
  service_categories (name)
`;

type ServiceRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration_minutes: number;
  image_url: string | null;
  display_order: number;
  service_categories: { name: string } | { name: string }[] | null;
};

type BarberCatalogRow = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  experience_years: number;
  rating_average: number;
  review_count: number;
  barber_services: {
    custom_price: number | null;
    custom_duration_minutes: number | null;
    is_active: boolean;
    services:
      | {
          id: string;
          name: string;
          base_price: number;
          duration_minutes: number;
          is_active: boolean;
          service_categories: { name: string } | { name: string }[] | null;
        }
      | {
          id: string;
          name: string;
          base_price: number;
          duration_minutes: number;
          is_active: boolean;
          service_categories: { name: string } | { name: string }[] | null;
        }[]
      | null;
  }[];
  barber_schedules: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    valid_from: string;
    valid_to: string | null;
    is_active: boolean;
  }[];
};

function serializeService(service: ServiceRow) {
  const category = Array.isArray(service.service_categories)
    ? service.service_categories[0]
    : service.service_categories;

  return {
    id: service.id,
    categoryId: service.category_id,
    categoryName: category?.name ?? "Uncategorized",
    name: service.name,
    description: service.description ?? "",
    price: Number(service.base_price),
    durationMinutes: service.duration_minutes,
    imageUrl: service.image_url,
    displayOrder: service.display_order,
  };
}

function serializeBarber(barber: BarberCatalogRow) {
  const services = barber.barber_services.flatMap((assignment) => {
    if (!assignment.is_active || !assignment.services) return [];

    const service = Array.isArray(assignment.services)
      ? assignment.services[0]
      : assignment.services;

    if (!service?.is_active) return [];

    const category = Array.isArray(service.service_categories)
      ? service.service_categories[0]
      : service.service_categories;

    return [
      {
        id: service.id,
        name: service.name,
        categoryName: category?.name ?? "Uncategorized",
        price: Number(assignment.custom_price ?? service.base_price),
        durationMinutes:
          assignment.custom_duration_minutes ?? service.duration_minutes,
      },
    ];
  });

  return {
    id: barber.id,
    name: barber.display_name,
    bio: barber.bio ?? "",
    avatarUrl: barber.avatar_url,
    experienceYears: barber.experience_years,
    ratingAverage: Number(barber.rating_average),
    reviewCount: barber.review_count,
    specialties: [...new Set(services.map((service) => service.categoryName))],
    services,
    schedules: barber.barber_schedules
      .filter((schedule) => schedule.is_active)
      .map((schedule) => ({
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        validFrom: schedule.valid_from,
        validTo: schedule.valid_to,
      })),
  };
}

publicRouter.get(
  "/api/public/services",
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const [categoriesResult, servicesResult, shopResult] = await Promise.all([
        supabase
          .from("service_categories")
          .select("id, name, description, display_order")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("services")
          .select(serviceFields)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase.from("shop_settings").select("shop_name").limit(1).single(),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (shopResult.error) throw shopResult.error;

      return response.status(200).json({
        success: true,
        data: {
          shopName: shopResult.data.shop_name,
          categories: categoriesResult.data.map((category) => ({
            id: category.id,
            name: category.name,
            description: category.description ?? "",
            displayOrder: category.display_order,
          })),
          services: (servicesResult.data as ServiceRow[]).map(serializeService),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

publicRouter.get(
  "/api/public/home",
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const [servicesResult, barbersResult, shopResult] = await Promise.all([
        supabase
          .from("services")
          .select(serviceFields)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("barbers")
          .select(
            "id, display_name, bio, avatar_url, experience_years, rating_average, review_count",
          )
          .eq("is_active", true)
          .order("rating_average", { ascending: false })
          .order("display_name", { ascending: true }),
        supabase
          .from("shop_settings")
          .select("shop_name, address, phone, email, timezone, currency")
          .limit(1)
          .single(),
      ]);

      if (servicesResult.error) throw servicesResult.error;
      if (barbersResult.error) throw barbersResult.error;
      if (shopResult.error) throw shopResult.error;

      return response.status(200).json({
        success: true,
        data: {
          services: (servicesResult.data as ServiceRow[]).map(serializeService),
          barbers: barbersResult.data.map((barber) => ({
            id: barber.id,
            name: barber.display_name,
            bio: barber.bio ?? "",
            avatarUrl: barber.avatar_url,
            experienceYears: barber.experience_years,
            ratingAverage: Number(barber.rating_average),
            reviewCount: barber.review_count,
          })),
          shop: {
            name: shopResult.data.shop_name,
            address: shopResult.data.address,
            phone: shopResult.data.phone,
            email: shopResult.data.email,
            timezone: shopResult.data.timezone,
            currency: shopResult.data.currency,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

publicRouter.get(
  "/api/public/barbers",
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const [barbersResult, shopResult] = await Promise.all([
        supabase
          .from("barbers")
          .select(
            `
              id,
              display_name,
              bio,
              avatar_url,
              experience_years,
              rating_average,
              review_count,
              barber_services (
                custom_price,
                custom_duration_minutes,
                is_active,
                services (
                  id,
                  name,
                  base_price,
                  duration_minutes,
                  is_active,
                  service_categories (name)
                )
              ),
              barber_schedules (
                day_of_week,
                start_time,
                end_time,
                valid_from,
                valid_to,
                is_active
              )
            `,
          )
          .eq("is_active", true)
          .order("rating_average", { ascending: false })
          .order("display_name", { ascending: true }),
        supabase
          .from("shop_settings")
          .select("shop_name, timezone")
          .limit(1)
          .single(),
      ]);

      if (barbersResult.error) throw barbersResult.error;
      if (shopResult.error) throw shopResult.error;

      return response.status(200).json({
        success: true,
        data: {
          shopName: shopResult.data.shop_name,
          timezone: shopResult.data.timezone,
          barbers: (barbersResult.data as BarberCatalogRow[]).map(
            serializeBarber,
          ),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
