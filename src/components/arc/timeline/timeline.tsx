"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { ChevronDown } from "@keyline-icons/react/duotone";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./timeline.module.css";

export interface TimelineEvent {
  id: string;
  /** When it happened, as an ISO string or epoch milliseconds. Optional when timeLabel is provided. */
  at?: string | number;
  /** Who did it, shown first in the foreground color. */
  actor?: string;
  /** What happened, completing the actor: "merged Checkout redesign into main". */
  title: string;
  /** Optional inline node rendered right after the title (e.g. a status dot). */
  titleSuffix?: ReactNode;
  /** Short context under the title, such as a pull request, build, or location. */
  meta?: string;
  /** Revealed in place when the row is expanded. Rows without detail are not interactive. */
  detail?: ReactNode;
  /** Portrait for an event by a person. */
  avatar?: string;
  /** Icon for a system event, used when there is no avatar or custom marker. */
  icon?: ReactNode;
  /** Custom marker node (e.g. duotone IconBadge) replacing the default circle. */
  marker?: ReactNode;
  /** Status of a system event. Always say the outcome in the title too, so it never rests on color. */
  tone?: "neutral" | "success" | "danger" | "warning" | "accent";
  /** Optional explicit group key when groupBy="custom". */
  group?: string;
  /** Pre-formatted time label (e.g. "07:24"), overriding relative/clock formatting. */
  timeLabel?: string;
  /** Accessible full time label for screen readers and tooltip. */
  timeFull?: string;
  /** Optional trailing badge/pill rendered beside the time. */
  badge?: ReactNode;
  /** Highlights the row with an inset accent ring (zero layout shift). */
  highlight?: boolean;
  /** Visual emphasis for title and time readout. */
  emphasis?: "default" | "strong" | "accent";
}

export interface TimelineGroupMeta {
  label: string;
  /** Optional custom header node replacing the plain label text. */
  header?: ReactNode;
  /** Whether to draw a dashed lane divider across the remainder of the group header. */
  showDivider?: boolean;
}

/**
 * A vertical activity and schedule feed grouped by day or custom phases. Day/phase labels stay pinned while rows
 * scroll, the connecting line draws itself as rows come into view, rows expand in place, and new updates slide in
 * at the top while the rest glide down. Arrow keys move between rows, Enter or Space expands one.
 */
export interface TimelineProps {
  /** Updates or schedule steps. */
  events: TimelineEvent[];
  /** Reference time for relative labels and day groups, in epoch milliseconds. */
  now?: number;
  /** Accessible name for the feed. */
  label: string;
  /** Time zone for day groups and clock times. Fixed by default so server and client agree. */
  timeZone?: string;
  locale?: string;
  /** Height of the scrolling area. Without it the feed grows with the page and reveals on page scroll. */
  maxHeight?: number | string;
  /** Scroll back to the top when a new update arrives while the feed is scrolled down. */
  scrollToNew?: boolean;
  defaultExpanded?: string[];
  /** Heading level for the day/group labels. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Ordering of events: "desc" (newest first, default), "asc", or "preserve" (keep input order). */
  sortOrder?: "desc" | "asc" | "preserve";
  /** Grouping strategy: "day" (default), "custom" (by event.group), or "none". */
  groupBy?: "day" | "custom" | "none";
  /** Custom labels/headers for groups when groupBy="custom". */
  groupLabels?: Record<string, TimelineGroupMeta>;
  /** Show the item count in group headers (default true). */
  showGroupCount?: boolean;
  /** Connecting spine line style: "solid" (default) or "dashed" (tarmac lane). */
  connectorStyle?: "solid" | "dashed";
  /** Marker size: "sm" (28px, default) or "md" (32px). */
  markerSize?: "sm" | "md";
  className?: string;
}

type Row = TimelineEvent & { time: number; day: string };
type Group = { day: string; label: string; header?: ReactNode; showDivider?: boolean; rows: Row[] };

const HOUR = 3_600_000;
const enter = [...motionTokens.ease.enter] as [number, number, number, number];
const standard = [...motionTokens.ease.standard] as [number, number, number, number];
/** Seconds between rows revealed together, so the line reads as drawing downward. */
const STEP = 0.09;
const noopSubscribe = () => () => {};
const blurSoft = typeof motionTokens.blur.soft === "number" ? `${motionTokens.blur.soft}px` : motionTokens.blur.soft;
const blurSubtle = typeof motionTokens.blur.subtle === "number" ? `${motionTokens.blur.subtle}px` : motionTokens.blur.subtle;

/** Reduced motion only after hydration, so the server and the first client render agree. */
function useReducedMotionSafe() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduced = useReducedMotion();
  return hydrated && !!reduced;
}

/** Rows reveal against the viewport, which already clips by the scroll area, so they wait until they are visible in both. */
type Clock = { schedule: () => number; reduced: boolean; fresh: Set<string> };
const RevealClock = createContext<Clock | null>(null);

/** Text that changes in place: the new value rises in from a soft blur while the old one lifts away a little faster. */
function RiseText({ text, reduced, direction = 1 }: { text: string; reduced: boolean; direction?: number }) {
  return (
    <span className={styles.rise} aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={text}
          className={styles.riseLine}
          custom={direction}
          variants={{
            from: (dir: number) =>
              reduced
                ? { opacity: 0 }
                : { opacity: 0, y: `${0.3 * dir}em`, filter: `blur(${blurSoft})` },
            to: { opacity: 1, y: "0em", filter: "blur(0px)" },
            gone: (dir: number) =>
              reduced
                ? { opacity: 0, transition: { duration: 0 } }
                : {
                    opacity: 0,
                    y: `${-0.3 * dir}em`,
                    filter: `blur(${blurSubtle})`,
                    transition: { duration: motionTokens.duration.fast, ease: standard },
                  },
          }}
          initial="from"
          animate="to"
          exit="gone"
          transition={{
            duration: reduced ? motionTokens.duration.instant : motionTokens.duration.standard,
            ease: enter,
          }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The day's update count rolls digit by digit in the direction it moved. */
function RollingCount({ value, reduced }: { value: number; reduced: boolean }) {
  const [state, setState] = useState({ value, direction: 1 });
  if (state.value !== value) setState({ value, direction: value > state.value ? 1 : -1 });
  const chars = [...String(value)];
  return (
    <span className={styles.rolling} aria-hidden="true">
      {chars.map((char, index) => (
        <span key={chars.length - index} className={styles.place}>
          <RiseText text={char} reduced={reduced} direction={state.direction} />
        </span>
      ))}
    </span>
  );
}

function dayKey(time: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(time));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function relative(time: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 1) return { short: "Now", long: "just now" };
  if (minutes < 60) return { short: `${minutes}m`, long: `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago` };
  const hours = Math.floor(minutes / 60);
  return { short: `${hours}h`, long: `${hours} ${hours === 1 ? "hour" : "hours"} ago` };
}

/** A day's or phase's section. A new section opens from nothing and pushes older ones down; it clips only while it grows. */
function DaySection({
  id,
  fresh,
  reduced,
  children,
}: {
  id: string;
  fresh: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  const [entering, setEntering] = useState(fresh);
  return (
    <motion.section
      className={styles.group}
      aria-labelledby={id}
      data-entering={entering || undefined}
      initial={fresh ? { height: 0, opacity: 0 } : false}
      animate={{ height: "auto", opacity: 1 }}
      exit={{
        height: 0,
        opacity: 0,
        transition: { duration: reduced ? motionTokens.duration.instant : motionTokens.duration.exit, ease: standard },
      }}
      transition={
        reduced
          ? { duration: motionTokens.duration.fast }
          : {
              height: motionTokens.spring.smooth,
              opacity: { duration: motionTokens.duration.standard, ease: enter },
            }
      }
      onAnimationComplete={() => setEntering(false)}
    >
      {children}
    </motion.section>
  );
}

function TimelineRow({
  row,
  last,
  expanded,
  onToggle,
  timeLabel,
  timeFull,
  connectorStyle,
  scrolls,
  rowIndex,
}: {
  row: Row;
  last: boolean;
  expanded: boolean;
  onToggle: () => void;
  timeLabel: string;
  timeFull: string;
  connectorStyle: "solid" | "dashed";
  scrolls: boolean;
  rowIndex: number;
}) {
  const clock = useContext(RevealClock)!;
  const { reduced } = clock;
  const detailId = useId();
  // When embedded in page flow (!scrolls), reveal with a gentle stagger on mount so markers never stay hidden on fast scrolls.
  // When inside a maxHeight scroller (scrolls), reveal as rows enter the scroll viewport.
  const [revealDelay, setRevealDelay] = useState<number | null>(() =>
    scrolls ? null : reduced ? 0 : Math.min(rowIndex * 0.045, 0.36)
  );
  const fresh = clock.fresh.has(row.id);
  const [entering, setEntering] = useState(fresh);
  const shown = revealDelay !== null;
  const delay = (revealDelay ?? 0) + (fresh ? 0.12 : 0);
  const pop: Transition = reduced
    ? { duration: 0, opacity: { duration: motionTokens.duration.fast } }
    : { ...motionTokens.spring.snappy, delay, opacity: { duration: motionTokens.duration.fast, ease: enter, delay } };
  const draw: Transition = reduced ? { duration: 0 } : { ...motionTokens.spring.smooth, delay: delay + 0.1 };
  const hasCustomMarker = Boolean(row.marker);
  const tone = row.avatar || hasCustomMarker ? undefined : row.tone ?? "neutral";
  const Trigger = row.detail ? "button" : "div";
  const titleEmphasis = row.emphasis === "strong" || row.emphasis === "accent" ? "strong" : undefined;
  const timeEmphasis = row.emphasis === "accent" ? "accent" : row.emphasis === "strong" ? "strong" : undefined;

  return (
    <motion.li
      className={styles.item}
      data-entering={entering || undefined}
      initial={fresh ? { height: 0 } : false}
      animate={{ height: "auto" }}
      exit={{
        height: 0,
        opacity: 0,
        transition: reduced
          ? { duration: motionTokens.duration.instant }
          : { height: motionTokens.spring.smooth, opacity: { duration: motionTokens.duration.instant } },
      }}
      transition={reduced ? { duration: 0 } : motionTokens.spring.smooth}
      onAnimationComplete={() => setEntering(false)}
      onViewportEnter={scrolls ? () => setRevealDelay((current) => current ?? clock.schedule()) : undefined}
      viewport={scrolls ? { once: true, amount: 0.05 } : undefined}
    >
      <motion.span
        className={styles.marker}
        data-tone={tone}
        data-custom-marker={hasCustomMarker || undefined}
        aria-hidden="true"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={shown ? { scale: 1, opacity: 1 } : undefined}
        transition={pop}
      >
        {hasCustomMarker ? (
          row.marker
        ) : row.avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element -- registry components stay framework agnostic */
          <img src={row.avatar} alt="" width={28} height={28} decoding="async" />
        ) : (
          row.icon
        )}
      </motion.span>
      {!last && (
        <motion.span
          className={styles.segment}
          data-connector={connectorStyle}
          aria-hidden="true"
          initial={{ scaleY: 0 }}
          animate={shown ? { scaleY: 1 } : undefined}
          transition={draw}
        />
      )}
      <motion.div
        className={styles.content}
        data-highlight={row.highlight || undefined}
        data-expanded={expanded || undefined}
        initial={
          fresh
            ? reduced
              ? { opacity: 0 }
              : { opacity: 0, y: -10, filter: `blur(${blurSoft})` }
            : false
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={
          reduced
            ? { duration: motionTokens.duration.fast }
            : {
                y: motionTokens.spring.smooth,
                opacity: { duration: motionTokens.duration.standard, ease: enter, delay: 0.05 },
                filter: { duration: motionTokens.duration.standard, ease: enter, delay: 0.05 },
              }
        }
      >
        <Trigger
          className={styles.trigger}
          {...(row.detail
            ? {
                type: "button" as const,
                "data-timeline-trigger": "",
                "aria-expanded": expanded,
                "aria-controls": expanded ? detailId : undefined,
                onClick: onToggle,
              }
            : {})}
        >
          <span className={styles.text}>
            <span className={styles.title} data-emphasis={titleEmphasis}>
              {row.actor && <span className={styles.actor}>{row.actor}</span>}
              {row.actor ? " " : ""}
              {row.title}
              {row.titleSuffix}
            </span>
            {row.meta && <span className={styles.meta}>{row.meta}</span>}
          </span>
          <span className={styles.trailing}>
            {row.badge}
            <time
              className={styles.time}
              data-emphasis={timeEmphasis}
              dateTime={row.at ? new Date(row.time).toISOString() : undefined}
              title={timeFull || undefined}
            >
              <RiseText text={timeLabel} reduced={reduced} />
              {timeFull && <span className={styles.srOnly}>{timeFull}</span>}
            </time>
          </span>
          {row.detail && (
            <motion.span
              className={styles.chevron}
              aria-hidden="true"
              initial={false}
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={reduced ? { duration: 0 } : motionTokens.spring.snappy}
            >
              <ChevronDown size={15} strokeWidth={1.75} />
            </motion.span>
          )}
        </Trigger>
        <AnimatePresence initial={false}>
          {expanded && row.detail && (
            <motion.div
              key="detail"
              id={detailId}
              className={styles.detail}
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{
                height: 0,
                transition: reduced ? { duration: 0 } : { ...motionTokens.spring.smooth, visualDuration: 0.28 },
              }}
              transition={reduced ? { duration: 0 } : motionTokens.spring.smooth}
            >
              <motion.div
                className={styles.detailInner}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4, filter: `blur(${blurSoft})` }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, transition: { duration: motionTokens.duration.instant, ease: standard } }}
                transition={
                  reduced
                    ? { duration: motionTokens.duration.fast }
                    : { duration: motionTokens.duration.standard, ease: enter, delay: 0.06 }
                }
              >
                {row.detail}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.li>
  );
}

export function Timeline({
  events,
  now = Date.now(),
  label,
  timeZone = "UTC",
  locale = "en-US",
  maxHeight,
  scrollToNew = true,
  defaultExpanded = [],
  headingLevel = 3,
  sortOrder = "desc",
  groupBy = "day",
  groupLabels,
  showGroupCount = true,
  connectorStyle = "solid",
  markerSize = "sm",
  className,
}: TimelineProps) {
  const reduced = useReducedMotionSafe();
  const id = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(() => new Set(defaultExpanded));

  // Rows added after the first render are fresh: they slide in and the rest glide down. Their titles are announced.
  const ids = events.map((event) => event.id).join("|");
  const [known, setKnown] = useState(() => ({
    ids,
    set: new Set(events.map((event) => event.id)),
    fresh: new Set<string>(),
    announcement: "",
  }));
  if (known.ids !== ids) {
    const added = events.filter((event) => !known.set.has(event.id));
    setKnown({
      ids,
      set: new Set(events.map((event) => event.id)),
      fresh: new Set([...known.fresh, ...added.map((event) => event.id)]),
      announcement: added.length
        ? `New update: ${added.map((event) => [event.actor, event.title].filter(Boolean).join(" ")).join(". ")}`
        : known.announcement,
    });
  }

  // The bottom edge feathers while more updates wait below, and clears once the end is in view.
  const trackRef = useRef<HTMLDivElement>(null);
  const scrolls = maxHeight !== undefined;
  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scrolls || !scroller || !track || typeof ResizeObserver === "undefined") return;
    const update = () => {
      if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 2) scroller.dataset.more = "";
      else delete scroller.dataset.more;
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(track);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scrolls]);

  const newestId = events.reduce<TimelineEvent | null>(
    (latest, event) =>
      event.at && (!latest || !latest.at || new Date(event.at).getTime() > new Date(latest.at).getTime())
        ? event
        : latest,
    null
  )?.id;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scrollToNew || !scroller || scroller.scrollTop < 1) return;
    scroller.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [newestId, scrollToNew, reduced]);

  const [initialDays] = useState(
    () =>
      new Set(
        events.map((event) =>
          groupBy === "custom"
            ? event.group ?? "default"
            : groupBy === "none"
            ? "all"
            : dayKey(event.at ? new Date(event.at).getTime() : now, timeZone)
        )
      )
  );

  const groups = useMemo<Group[]>(() => {
    const withTime = events.map((event, idx) => ({
      ...event,
      time: event.at ? new Date(event.at).getTime() : now + idx,
    }));

    const sorted =
      sortOrder === "preserve"
        ? withTime
        : [...withTime].sort((a, b) => (sortOrder === "asc" ? a.time - b.time : b.time - a.time));

    if (groupBy === "none") {
      return [
        {
          day: "all",
          label: "",
          rows: sorted.map((event) => ({ ...event, day: "all" })),
        },
      ];
    }

    if (groupBy === "custom") {
      const byGroup = new Map<string, Row[]>();
      sorted.forEach((event) => {
        const key = event.group ?? "default";
        byGroup.set(key, [...(byGroup.get(key) ?? []), { ...event, day: key }]);
      });
      return [...byGroup].map(([key, rows]) => {
        const meta = groupLabels?.[key];
        return {
          day: key,
          label: meta?.label ?? key,
          header: meta?.header,
          showDivider: meta?.showDivider,
          rows,
        };
      });
    }

    const today = dayKey(now, timeZone);
    const yesterday = dayKey(now - 24 * HOUR, timeZone);
    const heading = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone });
    const byDay = new Map<string, Row[]>();
    sorted.forEach((event) => {
      const day = dayKey(event.time, timeZone);
      byDay.set(day, [...(byDay.get(day) ?? []), { ...event, day }]);
    });
    return [...byDay].map(([day, rows]) => ({
      day,
      rows,
      label: day === today ? "Today" : day === yesterday ? "Yesterday" : heading.format(new Date(rows[0]!.time)),
    }));
  }, [events, now, timeZone, locale, sortOrder, groupBy, groupLabels]);

  const formats = useMemo(
    () => ({
      clock: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }),
      full: new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      }),
    }),
    [locale, timeZone]
  );

  // Rows that come into view together are spaced a beat apart, so the line reads as drawing down the feed.
  const nextReveal = useRef(0);
  const schedule = useCallback(() => {
    if (reduced) return 0;
    const current = performance.now() / 1000;
    const start = Math.min(Math.max(current, nextReveal.current), current + 0.45);
    nextReveal.current = start + STEP;
    return start - current;
  }, [reduced]);
  const clock = useMemo<Clock>(() => ({ schedule, reduced, fresh: known.fresh }), [schedule, reduced, known.fresh]);

  function toggle(rowId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const triggers = [...(scrollerRef.current?.querySelectorAll<HTMLElement>("[data-timeline-trigger]") ?? [])];
    const index = triggers.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
        ? triggers.length - 1
        : Math.min(Math.max(index + (event.key === "ArrowDown" ? 1 : -1), 0), triggers.length - 1);
    triggers[next]?.focus();
  }

  return (
    <RevealClock.Provider value={clock}>
      <div
        className={[styles.root, className].filter(Boolean).join(" ")}
        data-marker-size={markerSize}
        role="region"
        aria-label={label}
      >
        <div
          ref={scrollerRef}
          className={styles.scroller}
          data-scrolls={scrolls || undefined}
          style={
            scrolls
              ? ({ "--timeline-height": typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight } as CSSProperties)
              : undefined
          }
          onKeyDown={onKeyDown}
        >
          {/* Presence starts enabled so markers keep their hidden first frame; rows and days present at mount opt out of entering themselves. */}
          <div ref={trackRef}>
            <AnimatePresence>
              {groups.map((group) => (
                <DaySection
                  key={group.day}
                  id={`${id}-${group.day}`}
                  fresh={!initialDays.has(group.day)}
                  reduced={reduced}
                >
                  {groupBy !== "none" && (
                    <div className={styles.day} role="heading" aria-level={headingLevel} id={`${id}-${group.day}`}>
                      <span className={styles.dayMain}>
                        {group.header ?? <span>{group.label}</span>}
                        {group.showDivider && <span className={styles.dayDivider} aria-hidden="true" />}
                      </span>
                      {showGroupCount && (
                        <>
                          <span className={styles.count} aria-hidden="true">
                            <RollingCount value={group.rows.length} reduced={reduced} />{" "}
                            {group.rows.length === 1 ? "update" : "updates"}
                          </span>
                          <span className={styles.srOnly}>
                            {`, ${group.rows.length} ${group.rows.length === 1 ? "update" : "updates"}`}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <ol className={styles.list}>
                    <AnimatePresence>
                      {group.rows.map((row, index) => {
                        const isToday = group.label === "Today" && now - row.time < 12 * HOUR;
                        const computedTime = row.timeLabel
                          ? { short: row.timeLabel, long: row.timeFull ?? row.timeLabel }
                          : isToday
                          ? relative(row.time, now)
                          : { short: formats.clock.format(new Date(row.time)), long: "" };
                        const computedFull =
                          row.timeFull ??
                          (row.timeLabel
                            ? row.timeLabel
                            : isToday
                            ? `${computedTime.long}, ${formats.full.format(new Date(row.time))}`
                            : formats.full.format(new Date(row.time)));

                        return (
                          <TimelineRow
                            key={row.id}
                            row={row}
                            last={index === group.rows.length - 1}
                            expanded={expanded.has(row.id)}
                            onToggle={() => toggle(row.id)}
                            timeLabel={computedTime.short}
                            timeFull={computedFull}
                            connectorStyle={connectorStyle}
                            scrolls={scrolls}
                            rowIndex={index}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </ol>
                </DaySection>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <span className={styles.srOnly} role="status">
          {known.announcement}
        </span>
      </div>
    </RevealClock.Provider>
  );
}

export default Timeline;
