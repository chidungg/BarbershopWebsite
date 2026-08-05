import { createSupabaseAdminClient } from "../../lib/supabase";

type BarberRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  experience_years: number;
  is_active: boolean;
};

type ScheduleRow = {
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  valid_from: string;
  valid_to: string | null;
};

type ExceptionRow = {
  barber_id: string;
  exception_date: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_minutes: number | null;
  note: string | null;
};

type TimeOffRow = {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
};

type Shift = {
  start: string;
  end: string;
  slotMinutes: number;
};

type ScheduleCell = {
  date: string;
  type: "work" | "day_off" | "leave";
  label: string;
  detail: string;
  note: string;
  shifts: Shift[];
};

export function isValidScheduleDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function addDays(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function getScheduleWeekStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return addDays(value, -((date.getUTCDay() + 6) % 7));
}

function getDayOfWeek(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getUTCDay();
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  return Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  ) - date.getTime();
}

function localDateToUtc(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));

  return new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone));
}

function getLocalDateTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function formatShift(shift: Shift) {
  return `${shift.start.slice(0, 5)}–${shift.end.slice(0, 5)}`;
}

function countConflicts(shifts: Shift[]) {
  const sorted = [...shifts].sort(
    (first, second) => timeToMinutes(first.start) - timeToMinutes(second.start),
  );

  let conflicts = 0;
  let furthestEnd = -1;

  sorted.forEach((shift) => {
    const start = timeToMinutes(shift.start);
    const end = timeToMinutes(shift.end);

    if (start < furthestEnd) conflicts += 1;
    furthestEnd = Math.max(furthestEnd, end);
  });

  return conflicts;
}

function getLeaveDetail(items: TimeOffRow[], date: string, timeZone: string) {
  return items.map((item) => {
    const start = getLocalDateTime(item.starts_at, timeZone);
    const end = getLocalDateTime(item.ends_at, timeZone);
    const startTime = start.date < date ? "00:00" : start.time;
    const endTime = end.date > date ? "24:00" : end.time;

    return `${startTime}–${endTime}`;
  }).join(", ");
}

export async function getAdminSchedules(weekStartInput: string, barberId: string) {
  const weekStart = getScheduleWeekStart(weekStartInput);
  const weekEnd = addDays(weekStart, 6);
  const weekEndExclusive = addDays(weekStart, 7);
  const supabase = createSupabaseAdminClient();

  const settingsResult = await supabase
    .from("shop_settings")
    .select("timezone")
    .eq("id", 1)
    .maybeSingle();

  if (settingsResult.error) throw settingsResult.error;

  const timeZone = settingsResult.data?.timezone?.trim() || "Asia/Ho_Chi_Minh";
  const rangeStart = localDateToUtc(weekStart, timeZone);
  const rangeEnd = localDateToUtc(weekEndExclusive, timeZone);

  const [
    barbersResult,
    schedulesResult,
    exceptionsResult,
    approvedLeaveResult,
    pendingLeaveResult,
  ] = await Promise.all([
    supabase
      .from("barbers")
      .select("id, display_name, avatar_url, experience_years, is_active")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),

    supabase
      .from("barber_schedules")
      .select("barber_id, day_of_week, start_time, end_time, slot_minutes, valid_from, valid_to")
      .eq("is_active", true),

    supabase
      .from("barber_schedule_exceptions")
      .select("barber_id, exception_date, is_working, start_time, end_time, slot_minutes, note")
      .gte("exception_date", weekStart)
      .lte("exception_date", weekEnd),

    supabase
      .from("barber_time_off")
      .select("id, barber_id, starts_at, ends_at, reason, created_at")
      .eq("status", "approved")
      .lt("starts_at", rangeEnd.toISOString())
      .gt("ends_at", rangeStart.toISOString()),

    supabase
      .from("barber_time_off")
      .select("id, barber_id, starts_at, ends_at, reason, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const databaseError = barbersResult.error
    ?? schedulesResult.error
    ?? exceptionsResult.error
    ?? approvedLeaveResult.error
    ?? pendingLeaveResult.error;

  if (databaseError) throw databaseError;

  const allBarbers = (barbersResult.data ?? []) as BarberRow[];
  const barbers = barberId
    ? allBarbers.filter((barber) => barber.id === barberId)
    : allBarbers;

  const schedules = (schedulesResult.data ?? []) as ScheduleRow[];
  const exceptions = (exceptionsResult.data ?? []) as ExceptionRow[];
  const approvedLeave = (approvedLeaveResult.data ?? []) as TimeOffRow[];

  const pendingLeave = ((pendingLeaveResult.data ?? []) as TimeOffRow[])
    .filter((item) => !barberId || item.barber_id === barberId);

  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  let scheduleConflicts = 0;

  const rows = barbers.map((barber) => {
    const days = dates.map((date): ScheduleCell => {
      const dayExceptions = exceptions.filter(
        (item) => item.barber_id === barber.id && item.exception_date === date,
      );

      const closedException = dayExceptions.find((item) => !item.is_working);

      const regularShifts = schedules
        .filter((item) => (
          item.barber_id === barber.id
          && item.day_of_week === getDayOfWeek(date)
          && item.valid_from <= date
          && (!item.valid_to || item.valid_to >= date)
        ))
        .map((item) => ({
          start: item.start_time,
          end: item.end_time,
          slotMinutes: item.slot_minutes,
        }));

      const exceptionShifts = dayExceptions
        .filter((item) => item.is_working && item.start_time && item.end_time)
        .map((item) => ({
          start: item.start_time!,
          end: item.end_time!,
          slotMinutes: item.slot_minutes ?? 30,
        }));

      const shifts = closedException
        ? []
        : dayExceptions.length
          ? exceptionShifts
          : regularShifts;

      const dayStart = localDateToUtc(date, timeZone).getTime();
      const dayEnd = localDateToUtc(addDays(date, 1), timeZone).getTime();

      const leave = approvedLeave.filter((item) => (
        item.barber_id === barber.id
        && new Date(item.starts_at).getTime() < dayEnd
        && new Date(item.ends_at).getTime() > dayStart
      ));

      scheduleConflicts += countConflicts(shifts);

      if (leave.length) {
        return {
          date,
          type: "leave",
          label: "Leave",
          detail: getLeaveDetail(leave, date, timeZone),
          note: leave.map((item) => item.reason).filter(Boolean).join(", "),
          shifts: [],
        };
      }

      if (!shifts.length) {
        return {
          date,
          type: "day_off",
          label: "Day off",
          detail: "",
          note: closedException?.note?.trim() ?? "",
          shifts: [],
        };
      }

      const slotMinutes = [...new Set(shifts.map((shift) => shift.slotMinutes))];

      return {
        date,
        type: "work",
        label: shifts.map(formatShift).join(", "),
        detail: slotMinutes.length === 1
          ? `${slotMinutes[0]} min slots`
          : "Custom slot lengths",
        note: dayExceptions.map((item) => item.note).filter(Boolean).join(", "),
        shifts,
      };
    });

    return {
      id: barber.id,
      displayName: barber.display_name,
      avatarUrl: barber.avatar_url?.trim() || null,
      experienceYears: barber.experience_years,
      days,
    };
  });

  const workCells = rows
    .flatMap((row) => row.days)
    .filter((day) => day.type === "work");

  const scheduledHours = workCells.reduce((total, day) => {
    const cellMinutes = day.shifts.reduce((sum, shift) => {
      return sum + Math.max(
        0,
        timeToMinutes(shift.end) - timeToMinutes(shift.start),
      );
    }, 0);

    return total + cellMinutes;
  }, 0) / 60;

  const derivedShopHours = dates.map((date, index) => {
    const workDays = rows
      .map((row) => row.days[index])
      .filter((day) => day.type === "work");

    const shifts = workDays.flatMap((day) => day.shifts);

    if (!shifts.length) {
      return {
        date,
        hours: "Closed",
        activeBarbers: 0,
      };
    }

    const start = shifts.reduce((earliest, shift) => (
      timeToMinutes(shift.start) < timeToMinutes(earliest)
        ? shift.start
        : earliest
    ), shifts[0].start);

    const end = shifts.reduce((latest, shift) => (
      timeToMinutes(shift.end) > timeToMinutes(latest)
        ? shift.end
        : latest
    ), shifts[0].end);

    return {
      date,
      hours: `${start.slice(0, 5)}–${end.slice(0, 5)}`,
      activeBarbers: workDays.length,
    };
  });

  const barberMap = new Map(
    allBarbers.map((barber) => [barber.id, barber]),
  );

  return {
    weekStart,
    weekEnd,
    timeZone,

    metrics: {
      activeBarbers: barbers.length,
      scheduledShifts: workCells.length,
      scheduledHours: Math.round(scheduledHours * 10) / 10,
      pendingLeaveRequests: pendingLeave.length,
      scheduleConflicts,
    },

    barbers: allBarbers.map((barber) => ({
      id: barber.id,
      name: barber.display_name,
    })),

    rows: rows.map((row) => ({
      ...row,
      days: row.days.map(({ shifts, ...day }) => day),
    })),

    pendingLeaveRequests: pendingLeave.map((item) => ({
      id: item.id,
      barberId: item.barber_id,
      barberName: barberMap.get(item.barber_id)?.display_name ?? "Unknown barber",
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      reason: item.reason?.trim() || "No reason provided",
    })),

    derivedShopHours,
  };
}