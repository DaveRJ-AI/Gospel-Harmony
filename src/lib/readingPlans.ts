import comeFollowMeReadings from "../data/reading-plans/come-follow-me-2027.json";
import gospelYearReadings from "../data/reading-plans/four-gospels-in-a-year.json";
import type { PassageRef } from "./bible";
import { type Gospel } from "./refs";

export const PLAN_NAMES = {
  "come-follow-me-2027": "Come, Follow Me 2027",
  "daily-gospel-story": "Daily Gospel Story",
  "four-gospels-in-a-year": "Four Gospels in a Year",
} as const;

export type ReadingPlanId = keyof typeof PLAN_NAMES;

export type ChapterReading = {
  book: Gospel;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
};

const MILLISECONDS_PER_DAY = 86_400_000;
const FIRST_CFM_DAY = Date.UTC(2026, 11, 28) / MILLISECONDS_PER_DAY;
const CFM_MANUAL = "https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-new-testament-2027";
export const CFM_WEEK_COUNT = comeFollowMeReadings.length;
export const GOSPEL_YEAR_LENGTH = gospelYearReadings.length;

export function parsePlanId(value: string | null): ReadingPlanId | null {
  return value && Object.prototype.hasOwnProperty.call(PLAN_NAMES, value) ? value as ReadingPlanId : null;
}

export function localCalendarDay(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY;
}

export function currentCfmWeek(day: number) {
  return Math.floor((day - FIRST_CFM_DAY) / 7) + 1;
}

export function planDate(day: number) {
  return new Date(day * MILLISECONDS_PER_DAY).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function weekDates(week: number) {
  const start = FIRST_CFM_DAY + (week - 1) * 7;
  const first = new Date(start * MILLISECONDS_PER_DAY);
  const last = new Date((start + 6) * MILLISECONDS_PER_DAY);
  const options = { month: "short", day: "numeric", timeZone: "UTC" } as const;
  const firstLabel = first.toLocaleDateString("en-US", {
    ...options,
    year: first.getUTCFullYear() === last.getUTCFullYear() ? undefined : "numeric",
  });
  const lastLabel = first.getUTCMonth() === last.getUTCMonth()
    ? last.getUTCDate()
    : last.toLocaleDateString("en-US", options);
  return `${firstLabel}–${lastLabel}, ${last.getUTCFullYear()}`;
}

export function cfmWeek(week: number) {
  const assignment = comeFollowMeReadings[week - 1];
  const chapters = assignment.split("; ").flatMap((part) => {
    const match = /^(Matthew|Mark|Luke|John) (\d+)(?:–(\d+))?$/.exec(part);
    if (!match) return [];
    const [, gospel, first, last = first] = match;
    return Array.from({ length: Number(last) - Number(first) + 1 }, (_, index): ChapterReading => ({
      book: gospel as Gospel,
      chapter: Number(first) + index,
    }));
  });
  return {
    assignment,
    dates: weekDates(week),
    chapters,
    officialUrl: `${CFM_MANUAL}/${String(week).padStart(2, "0")}?lang=eng`,
  };
}

export function gospelYearDay(day: number): ChapterReading | undefined {
  const row = gospelYearReadings[day - 1];
  if (!row) return undefined;
  const [book, chapter, startVerse, endVerse] = row as [Gospel, number, number, number];
  return { book, chapter, startVerse, endVerse };
}

export function readingLabel(reading: ChapterReading) {
  const chapter = `${reading.book} ${reading.chapter}`;
  if (reading.startVerse === undefined) return chapter;
  return `${chapter}:${reading.startVerse}${reading.endVerse !== reading.startVerse ? `–${reading.endVerse}` : ""}`;
}

export function overlapsReading(ref: PassageRef, reading: ChapterReading) {
  if (ref.book !== reading.book || ref.startChapter > reading.chapter || ref.endChapter < reading.chapter) {
    return false;
  }
  const startsBeforeEnd = ref.startChapter < reading.chapter || ref.startVerse <= (reading.endVerse ?? Infinity);
  const endsAfterStart = ref.endChapter > reading.chapter || ref.endVerse >= (reading.startVerse ?? 1);
  return startsBeforeEnd && endsAfterStart;
}

export function planPath(plan: ReadingPlanId, unit: number) {
  return `/?${new URLSearchParams({ plan, unit: String(unit) })}`;
}
