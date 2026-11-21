export function readPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // State still reflects the preference during this visit.
  }
}
