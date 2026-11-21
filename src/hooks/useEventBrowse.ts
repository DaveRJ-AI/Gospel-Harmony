import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { eventPath } from "../lib/eventNavigation";
import type { Version } from "../lib/refs";
import { useEsvAvailability } from "./useEsvAvailability";

export function useEventBrowse(ready: boolean) {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { esvAvailable, esvStatusChecked } = useEsvAvailability();
  const esvUnavailable = esvStatusChecked && !esvAvailable;
  const version: Version = params.get("version") === "ESV" && !esvUnavailable ? "ESV" : "KJV";
  const query = params.get("q") ?? "";
  const openKey = query.trim() ? "searchOpen" : "open";

  React.useLayoutEffect(() => {
    if (!ready || !hash.startsWith("#event-")) return;

    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const item = document.getElementById(id);
    item?.focus({ preventScroll: true });
    item?.scrollIntoView({ block: "center" });
  }, [ready, hash]);

  function setFilter(key: string, values: string[]) {
    const next = new URLSearchParams(params);
    next.delete(key);
    if (key === "q") next.delete("searchOpen");
    values.forEach((value) => next.append(key, value));
    setParams(next, { replace: true });
  }

  return {
    params,
    version,
    esvUnavailable,
    query,
    openSections: params.has(openKey) ? params.getAll(openKey).filter(Boolean) : null,
    setQuery: (value: string) => setFilter("q", value ? [value] : []),
    setVersion: (value: string) => setFilter("version", value === "ESV" ? [value] : []),
    setOpenSections: (ids: string[]) => setFilter(openKey, ids.length ? ids : [""]),
    openEvent: (id: string, anchor: string) => {
      const returnTo = `${pathname}${search}#${encodeURIComponent(anchor)}`;
      navigate(eventPath(id, version, returnTo));
    },
  };
}
