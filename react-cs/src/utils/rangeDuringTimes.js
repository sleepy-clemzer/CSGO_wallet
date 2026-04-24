/**
 * Enum of available time ranges for charts and timeline filtering.
 *
 * Use RANGE constants instead of raw strings to avoid typos
 * and make refactoring easier.
 *
 * Usage:
 *   import { RANGE } from "../utils/rangeDuringTimes";
 *   if (range === RANGE.DURING_7_DAYS) { ... }
 */
export const RANGE = Object.freeze({
  DURING_1_HOUR:   "1h",
  DURING_24_HOURS: "24h",
  DURING_7_DAYS:   "7d",
  DURING_30_DAYS:  "30d",
  DURING_1_YEAR:   "1y",
  ALL_TIME:        "all"
});

/**
 * Display labels for range buttons in the UI.
 * Keys match RANGE values.
 */
export const RANGE_LABELS = Object.freeze({
  [RANGE.DURING_1_HOUR]:   "1H",
  [RANGE.DURING_24_HOURS]: "24H",
  [RANGE.DURING_7_DAYS]:   "7J",
  [RANGE.DURING_30_DAYS]:  "30J",
  [RANGE.DURING_1_YEAR]:   "1A",
  [RANGE.ALL_TIME]:        "MAX"
});

/**
 * Duration in milliseconds for each range.
 * ALL_TIME maps to null — no lower time bound is applied.
 *
 * Usage:
 *   const cutoff = Date.now() - RANGE_MS[range];
 */
export const RANGE_MS = Object.freeze({
  [RANGE.DURING_1_HOUR]:   1   * 60 * 60 * 1000,
  [RANGE.DURING_24_HOURS]: 24  * 60 * 60 * 1000,
  [RANGE.DURING_7_DAYS]:   7   * 24 * 60 * 60 * 1000,
  [RANGE.DURING_30_DAYS]:  30  * 24 * 60 * 60 * 1000,
  [RANGE.DURING_1_YEAR]:   365 * 24 * 60 * 60 * 1000,
  [RANGE.ALL_TIME]:        null
});

/**
 * Ordered list of range keys for rendering range selector buttons.
 */
export const RANGE_LIST = [
  RANGE.DURING_1_HOUR,
  RANGE.DURING_24_HOURS,
  RANGE.DURING_7_DAYS,
  RANGE.DURING_30_DAYS,
  RANGE.DURING_1_YEAR,
  RANGE.ALL_TIME
];