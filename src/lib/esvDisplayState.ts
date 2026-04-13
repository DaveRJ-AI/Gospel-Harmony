const ESV_DISPLAY_EVENT = "esv-display-change";
const ESV_DISPLAY_KEY = "esv-display-active";

export function setEsvDisplayActive(active: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ESV_DISPLAY_KEY, active ? "1" : "0");
  window.dispatchEvent(
    new CustomEvent(ESV_DISPLAY_EVENT, {
      detail: { active },
    })
  );
}

export function getEsvDisplayActive() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(ESV_DISPLAY_KEY) === "1";
}

export function getEsvDisplayEventName() {
  return ESV_DISPLAY_EVENT;
}
