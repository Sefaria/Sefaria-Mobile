/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Sefaria API Utilities for Testing Framework
 * 
 * DESCRIPTION:
 *  - Helper functions to fetch and cache data from the Sefaria API.
 *  - Includes calendar, Daf Yomi, Haftarah, and other schedule fetchers.
 * USAGE:
 *  - Used in tests that require up-to-date Sefaria content.
 * ──────────────────────────────────────────────────────────────
 */

import axios from "axios";

const SEFARIA_CALENDAR_API = "https://www.sefaria.org/api/calendars";

export interface CalendarItem {
  title: { en: string; he: string };
  displayValue: { en: string; he: string };
  url: string;
  ref: string;
  heRef: string;
  order: number;
  category: string;
  extraDetails?: any;
  description?: { en: string; he: string };
}

export interface CalendarResponse {
  date: string;
  timezone: string;
  calendar_items: CalendarItem[];
}

// Simple in-memory cache
let cachedCalendarData: CalendarResponse | null = null;
let cachedParams: string | null = null;

function paramsKey(params?: object): string {
  return JSON.stringify(params || {});
}

/**
 * Fetches the Sefaria calendar API for the given date or for today.
 * Uses cached data if available and params are the same.
 * @param params Optional query parameters to specify the date or timezone.
 * @return Promise resolving to CalendarResponse containing calendar items.
 * If no params are provided, it defaults to today's date in the default user timezone.
 */
export async function getSefariaCalendar(
  params?: {
    diaspora?: 0 | 1;
    custom?: string;
    year?: number;
    month?: number;
    day?: number;
    timezone?: string;
  }
): Promise<CalendarResponse> {
  const key = paramsKey(params);
  if (cachedCalendarData && cachedParams === key) {
    return cachedCalendarData!;
  }
  const response = await axios.get(SEFARIA_CALENDAR_API, { params });
  cachedCalendarData = response.data;
  cachedParams = key;
  return cachedCalendarData!;
}

/**
 * Gets the current Daf Yomi from the Sefaria calendar API.
 * @returns The Daf Yomi calendar item, or undefined if not found.
 */
export async function getCurrentDafYomi(params?: {
  diaspora?: 0 | 1;
  custom?: string;
  year?: number;
  month?: number;
  day?: number;
  timezone?: string;
}): Promise<CalendarItem | undefined> {
  const data = await getSefariaCalendar(params);
  return data.calendar_items.find(
    (item) => item.title.en === "Daf Yomi" || item.title.he === "דף יומי"
  );
}

/**
 * Gets the current Haftarah from the Sefaria calendar API.
 * @returns The Haftarah calendar item, or undefined if not found.
 */
export async function getCurrentHaftarah(params?: {
  diaspora?: 0 | 1;
  custom?: string;
  year?: number;
  month?: number;
  day?: number;
  timezone?: string;
}): Promise<CalendarItem | undefined> {
  const data = await getSefariaCalendar(params);
  return data.calendar_items.find(
    (item) => item.title.en === "Haftarah" || item.title.he === "הפטרה"
  );
}

/**
 * Gets the current Parashat Hashavua (weekly Torah portion) from the Sefaria calendar API.
 * @returns The Parashat Hashavua calendar item, or undefined if not found.
 */
export async function getCurrentParashatHashavua(params?: {
  diaspora?: 0 | 1;
  custom?: string;
  year?: number;
  month?: number;
  day?: number;
  timezone?: string;
}): Promise<CalendarItem | undefined> {
  const data = await getSefariaCalendar(params);
  return data.calendar_items.find(
    (item) => item.title.en === "Parashat Hashavua" || item.title.he === "פרשת השבוע"
  );
}

/**
 * Gets the current "Daf a Week" from the Sefaria calendar API.
 * @returns The "Daf a Week" calendar item, or undefined if not found.
 */
export async function getCurrentDafAWeek(params?: {
  diaspora?: 0 | 1;
  custom?: string;
  year?: number;
  month?: number;
  day?: number;
  timezone?: string;
}): Promise<CalendarItem | undefined> {
  const data = await getSefariaCalendar(params);
  return data.calendar_items.find(
    (item) => item.title.en === "Daf a Week" || item.title.he === "דף לשבוע"
  );
}

/**
 * Gets a calendar item by its English and/or Hebrew title.
 * @param titleEn The English title to search for (required).
 * @param titleHe The Hebrew title to search for (optional).
 * @param params Optional query params for the calendar API.
 * @returns The matching calendar item, or undefined if not found.
 */
export async function getCalendarItemByTitle(
  titleEn: string,
  titleHe?: string,
  params?: {
    diaspora?: 0 | 1;
    custom?: string;
    year?: number;
    month?: number;
    day?: number;
    timezone?: string;
  }
): Promise<CalendarItem | undefined> {
  const data = await getSefariaCalendar(params);
  return data.calendar_items.find(
    (item) =>
      item.title.en === titleEn ||
      (titleHe ? item.title.he === titleHe : false)
  );
}

/**
 * Gets all learning schedule items (e.g., Parashat Hashavua, Daf Yomi, etc.) for today or a given date.
 * @param params Optional query params.
 * @returns Array of CalendarItem objects.
 */
export async function getLearningSchedules(params?: {
  diaspora?: 0 | 1;
  custom?: string;
  year?: number;
  month?: number;
  day?: number;
  timezone?: string;
}): Promise<CalendarItem[]> {
  const data = await getSefariaCalendar(params);
  return data.calendar_items;
}