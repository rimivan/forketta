const relativeFormatter = new Intl.RelativeTimeFormat("it", {
  numeric: "auto",
});

const shortDateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatRelativeTime(value: string): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }

  const diffMs = target.getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);

  if (Math.abs(minutes) < 60) {
    return relativeFormatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return relativeFormatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return relativeFormatter.format(days, "day");
  }

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) {
    return relativeFormatter.format(months, "month");
  }

  const years = Math.round(months / 12);
  return relativeFormatter.format(years, "year");
}

export function formatDateTime(value: string): string {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return value;
  }
  return shortDateFormatter.format(target);
}

export function classNames(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

export function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
