import type { Locale } from "../i18n";

const relativeFormatterCache = new Map<Locale, Intl.RelativeTimeFormat>();
const dateTimeFormatterCache = new Map<Locale, Intl.DateTimeFormat>();

function getRelativeFormatter(locale: Locale): Intl.RelativeTimeFormat {
  const cached = relativeFormatterCache.get(locale);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  });
  relativeFormatterCache.set(locale, formatter);
  return formatter;
}

function getDateTimeFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = dateTimeFormatterCache.get(locale);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  dateTimeFormatterCache.set(locale, formatter);
  return formatter;
}

export function formatRelativeTime(value: string, locale: Locale): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }

  const diffMs = target.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  const formatter = getRelativeFormatter(locale);

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return formatter.format(days, "day");
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return formatter.format(months, "month");
  }

  const years = Math.round(months / 12);
  return formatter.format(years, "year");
}

export function formatDateTime(value: string, locale: Locale): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }
  return getDateTimeFormatter(locale).format(target);
}

export function classNames(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

export function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
