import { Router, type NextFunction, type Request, type Response } from "express";

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
        supabase
          .from("shop_settings")
          .select("shop_name")
          .limit(1)
          .single(),
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
