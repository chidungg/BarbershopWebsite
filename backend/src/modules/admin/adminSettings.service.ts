import { createSupabaseAdminClient } from "../../lib/supabase";

export type AdminSettingsInput = {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  bookingAdvanceDays: number;
  cancellationNoticeHours: number;
  defaultSlotMinutes: number;
};

type ShopSettingsRow = {
  shop_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  booking_advance_days: number;
  cancellation_notice_hours: number;
  default_slot_minutes: number;
  updated_at: string;
};

function mapSettings(row: ShopSettingsRow) {
  return {
    shopName: row.shop_name,
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    timezone: row.timezone,
    currency: row.currency.trim(),
    bookingAdvanceDays: row.booking_advance_days,
    cancellationNoticeHours: row.cancellation_notice_hours,
    defaultSlotMinutes: row.default_slot_minutes,
    updatedAt: row.updated_at,
  };
}

export async function getAdminSettings() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("shop_settings")
    .select("shop_name, address, phone, email, timezone, currency, booking_advance_days, cancellation_notice_hours, default_slot_minutes, updated_at")
    .eq("id", 1)
    .single();

  if (error) throw error;
  return mapSettings(data as ShopSettingsRow);
}

export async function updateAdminSettings(input: AdminSettingsInput) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("shop_settings")
    .update({
      shop_name: input.shopName,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      timezone: input.timezone,
      currency: input.currency,
      booking_advance_days: input.bookingAdvanceDays,
      cancellation_notice_hours: input.cancellationNoticeHours,
      default_slot_minutes: input.defaultSlotMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("shop_name, address, phone, email, timezone, currency, booking_advance_days, cancellation_notice_hours, default_slot_minutes, updated_at")
    .single();

  if (error) throw error;
  return mapSettings(data as ShopSettingsRow);
}