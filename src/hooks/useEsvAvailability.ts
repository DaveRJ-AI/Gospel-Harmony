import React from "react";

type EsvAvailabilityState = {
  available: boolean;
  checked: boolean;
};

let cachedAvailability: EsvAvailabilityState | null = null;
let pendingAvailability: Promise<EsvAvailabilityState> | null = null;

async function fetchEsvAvailability(): Promise<EsvAvailabilityState> {
  const res = await fetch("/.netlify/functions/esvPassage?status=1");
  if (!res.ok) {
    return { available: false, checked: true };
  }

  const data = (await res.json()) as { available?: boolean };
  return { available: Boolean(data.available), checked: true };
}

export function useEsvAvailability() {
  const [state, setState] = React.useState<EsvAvailabilityState>(
    cachedAvailability ?? { available: false, checked: false }
  );

  React.useEffect(() => {
    let alive = true;

    if (cachedAvailability) {
      setState(cachedAvailability);
      return;
    }

    if (!pendingAvailability) {
      pendingAvailability = fetchEsvAvailability().then((result) => {
        cachedAvailability = result;
        return result;
      });
    }

    pendingAvailability.then((result) => {
      if (!alive) return;
      setState(result);
    });

    return () => {
      alive = false;
    };
  }, []);

  return {
    esvAvailable: state.available,
    esvStatusChecked: state.checked,
  };
}
