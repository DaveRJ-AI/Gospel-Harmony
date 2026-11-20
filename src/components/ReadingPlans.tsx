import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShareLink } from "./EventShare";
import { loadHarmony, type HarmonyData } from "../lib/harmony";
import {
  CFM_WEEK_COUNT, GOSPEL_YEAR_LENGTH, PLAN_NAMES, cfmWeek, currentCfmWeek,
  gospelYearDay, localCalendarDay, overlapsReading, parsePlanId, planDate, planPath, readingLabel,
  type ChapterReading, type ReadingPlanId,
} from "../lib/readingPlans";
import type { Version } from "../lib/refs";

const PREFERENCE_KEY = "gospel-harmonics.reading-plan";
const HOLIDAY_EVENTS: Record<string, string[]> = {
  "Easter Week": ["triumphal-entry", "last-supper", "gethsemane", "crucifixion", "resurrection"],
  Christmas: ["annunciation-mary", "birth-jesus", "shepherds", "magi"],
};

function readPreference(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writePreference(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Preferences remain usable for this visit. */ }
}

function startKey(plan: ReadingPlanId) {
  return `${PREFERENCE_KEY}.${plan}.start`;
}

function readStart(plan: ReadingPlanId) {
  const stored = readPreference(startKey(plan));
  const day = Number(stored);
  return stored && Number.isInteger(day) && day > 0 ? day : undefined;
}

function eventPath(id: string, version: Version, back: string) {
  const query = new URLSearchParams({ version, returnTo: back });
  return `/story/${encodeURIComponent(id)}?${query}`;
}

export default function ReadingPlans({ children, version, assignedReading, onRead, onPlanChange }: {
  children: (picker: React.ReactNode) => React.ReactNode;
  version: Version;
  assignedReading: ChapterReading | null;
  onRead: (reading: ChapterReading) => void;
  onPlanChange: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const [followed, setFollowed] = React.useState(() => parsePlanId(readPreference(PREFERENCE_KEY)));
  const [starts, setStarts] = React.useState(() => ({
    "daily-gospel-story": readStart("daily-gospel-story"),
    "four-gospels-in-a-year": readStart("four-gospels-in-a-year"),
  }));
  const shared = parsePlanId(params.get("plan"));
  const plan = shared ?? followed;
  const [browsedUnit, setBrowsedUnit] = React.useState<number>();
  const [today, setToday] = React.useState(() => localCalendarDay(new Date()));
  const [harmony, setHarmony] = React.useState<HarmonyData | null>(null);
  const [harmonyError, setHarmonyError] = React.useState(false);
  const cardRef = React.useRef<HTMLElement>(null);
  const shouldReveal = React.useRef(false);
  const revealedSharedPlan = React.useRef<ReadingPlanId | null>(null);

  React.useEffect(() => {
    if (!plan) return;
    const timer = window.setInterval(() => setToday(localCalendarDay(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, [plan]);

  React.useEffect(() => {
    if (!plan || harmony) return;
    let alive = true;
    setHarmonyError(false);
    loadHarmony().then(
      (data) => { if (alive) setHarmony(data); },
      () => { if (alive) setHarmonyError(true); },
    );
    return () => { alive = false; };
  }, [plan, harmony]);

  const weekly = plan === "come-follow-me-2027";
  const storyPlan = plan === "daily-gospel-story";
  const stories = React.useMemo(() => [...(harmony?.pericopes ?? [])].sort((a, b) =>
    (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || a.title.localeCompare(b.title),
  ), [harmony]);
  const count = weekly ? CFM_WEEK_COUNT : storyPlan ? stories.length : GOSPEL_YEAR_LENGTH;
  const start = plan && !weekly ? starts[plan as keyof typeof starts] : undefined;
  const actualUnit = weekly ? currentCfmWeek(today) : today - (start ?? today) + 1;
  const currentUnit = Math.max(1, Math.min(count, actualUnit));
  const requested = Number(params.get("unit"));
  const chosen = shared && Number.isSafeInteger(requested) && requested > 0 ? requested : browsedUnit;
  const unit = Math.max(1, Math.min(count, chosen ?? currentUnit));

  React.useEffect(() => {
    const openingSharedPlan = shared !== null && shared !== revealedSharedPlan.current;
    const card = cardRef.current;
    if (!shared) revealedSharedPlan.current = null;
    if (!card || (!openingSharedPlan && !shouldReveal.current)) return;
    shouldReveal.current = false;
    revealedSharedPlan.current = shared;
    if (openingSharedPlan || card.getBoundingClientRect().top > window.innerHeight - 160) {
      card.focus({ preventScroll: true });
      card.scrollIntoView({ block: "start" });
    }
  }, [plan, shared, count]);

  function choosePlan(next: ReadingPlanId | null, keepUnit = false) {
    if (next && next !== "come-follow-me-2027" && starts[next] === undefined) {
      setStarts((previous) => ({ ...previous, [next]: today }));
      writePreference(startKey(next), String(today));
    }
    setFollowed(next);
    shouldReveal.current = next !== null && !keepUnit;
    writePreference(PREFERENCE_KEY, next ?? "");
    setBrowsedUnit(keepUnit ? unit : undefined);
    if (shared) {
      const nextParams = new URLSearchParams(params);
      nextParams.delete("plan");
      nextParams.delete("unit");
      setParams(nextParams, { replace: true });
    }
    if (!keepUnit) onPlanChange();
  }

  function goToUnit(next: number | undefined) {
    if (shared) {
      const nextParams = new URLSearchParams(params);
      if (next === undefined) nextParams.delete("unit");
      else nextParams.set("unit", String(next));
      setParams(nextParams, { replace: true });
    }
    setBrowsedUnit(next);
  }

  const week = weekly ? cfmWeek(unit) : undefined;
  const day = plan === "four-gospels-in-a-year" ? gospelYearDay(unit) : undefined;
  const story = storyPlan ? stories[unit - 1] : undefined;
  const date = week?.dates ?? (start === undefined ? undefined : planDate(start + unit - 1));
  const readings = week?.chapters ?? (day ? [day] : []);
  const holidayIds = week ? HOLIDAY_EVENTS[week.assignment] : undefined;
  const relatedIds = holidayIds ?? (week ? harmony?.passages
    .filter((ref) => readings.some((reading) => overlapsReading(ref, reading)))
    .map((ref) => ref.pericopeId) : undefined);
  const related = relatedIds ? stories.filter((event) => relatedIds.includes(event.pericopeId)) : [];
  const path = plan && count ? planPath(plan, unit) : undefined;

  return (
    <>
      {children(
        <div className="readingPlanPicker">
          <label htmlFor="reading-plan">Reading plans</label>
          <select id="reading-plan" value={plan ?? ""} onChange={(event) => choosePlan(parsePlanId(event.target.value))}>
            <option value="">No plan selected</option>
            {Object.entries(PLAN_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>,
      )}

      {plan && storyPlan && !count && (
        <p role="status" className="muted">{harmonyError ? "The story list is unavailable. Reload to try again." : "Loading the story list…"}</p>
      )}

      {plan && path && (
        <section id="reading-plan-card" ref={cardRef} className="readingPlanCard" aria-label={PLAN_NAMES[plan]} tabIndex={-1}>
          <div className="readingPlanHeader">
            <div>
              <div className="readingPlanMeta">
                <span className="muted">
                  {PLAN_NAMES[plan]}{!weekly && ` · Day ${unit} of ${count}`}{date && ` · ${date}`}
                </span>
                {weekly && (
                  <div className="readingPlanWeekNav" aria-label="Browse weeks" role="group">
                    <button type="button" disabled={unit <= 1} onClick={() => goToUnit(unit - 1)}>Previous week</button>
                    <button type="button" disabled={unit >= count} onClick={() => goToUnit(unit + 1)}>Next week</button>
                  </div>
                )}
              </div>
              <h2>{week?.assignment ?? (day && readingLabel(day)) ?? story?.title}</h2>
              {story && <p className="muted">{story.summary}</p>}
            </div>
            <ShareLink key={path} path={path} title={PLAN_NAMES[plan]}
              label={weekly ? "Share week" : "Share day"} linkLabel="Reading plan link" />
          </div>

          <div className="readingPlanActions">
            {readings[0] && (
              <button type="button" className="readingPlanPrimary" onClick={() => onRead(readings[0])}>Start reading</button>
            )}
            {story && <Link className="readingPlanPrimary" to={eventPath(story.pericopeId, version, path)}>Read story</Link>}
            {week && (
              <a className={readings.length ? undefined : "readingPlanPrimary"} href={week.officialUrl}>
                {readings.length || holidayIds ? "Open official lesson" : "Open official reading"}
              </a>
            )}
            {shared && followed !== plan && (
              <button type="button" onClick={() => choosePlan(plan, true)}>Follow this plan</button>
            )}
          </div>

          {weekly && readings.length > 0 && (
            <div className="readingPlanActions" aria-label="Assigned chapters" role="group">
              {readings.map((reading) => (
                <button
                  key={readingLabel(reading)}
                  type="button"
                  aria-pressed={assignedReading?.book === reading.book && assignedReading.chapter === reading.chapter}
                  onClick={() => onRead(reading)}
                >
                  {readingLabel(reading)}
                </button>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <details>
              <summary>Related events</summary>
              <ul>
                {related.map((event) => (
                  <li key={event.pericopeId}><Link to={eventPath(event.pericopeId, version, path)}>{event.title}</Link></li>
                ))}
              </ul>
            </details>
          )}

          {!weekly && (
            <div className="readingPlanActions" aria-label="Browse assignments" role="group">
              <button type="button" disabled={unit <= 1} onClick={() => goToUnit(unit - 1)}>Previous day</button>
              <button type="button" onClick={() => goToUnit(undefined)}>Today</button>
              <button type="button" disabled={unit >= count} onClick={() => goToUnit(unit + 1)}>Next day</button>
            </div>
          )}

          {weekly && (
            <details>
              <summary>View full schedule</summary>
              <label htmlFor="reading-plan-week">Choose a week</label>
              <select id="reading-plan-week" value={unit} onChange={(event) => goToUnit(Number(event.target.value))}>
                {Array.from({ length: count }, (_, index) => {
                  const option = cfmWeek(index + 1);
                  return <option key={index + 1} value={index + 1}>{option.dates} · {option.assignment}</option>;
                })}
              </select>
            </details>
          )}
        </section>
      )}
    </>
  );
}
