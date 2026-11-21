import { parsePath } from "react-router-dom";
import type { Version } from "./refs";

const eventReturnLabels: Record<string, string> = {
  "/stories": "Back to events",
  "/timeline": "Back to timeline",
  "/art": "Back to artwork",
  "/types": "Back to themes",
  "/map": "Back to map",
};

export function eventPath(id: string, version: Version, returnTo?: string) {
  const params = new URLSearchParams({ version });
  if (returnTo) params.set("returnTo", returnTo);
  return `/story/${encodeURIComponent(id)}?${params}`;
}

export function eventOrigin(returnTo: string | null) {
  if (!returnTo) return null;

  const { pathname, search } = parsePath(returnTo);
  if (!pathname?.startsWith("/") || pathname.startsWith("//")) return null;
  const path = pathname.replace(/\/$/, "") || "/";
  const label = path === "/" && new URLSearchParams(search).has("plan")
    ? "Back to reading plan"
    : eventReturnLabels[path];
  return label ? { path: returnTo, label } : null;
}
