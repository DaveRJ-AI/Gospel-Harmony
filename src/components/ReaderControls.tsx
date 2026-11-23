import React from "react";

export function revealReadingControl(control: HTMLElement) {
  const controls = control.closest<HTMLElement>(".readerControls");
  if (!controls || matchMedia("(max-width: 760px)").matches) {
    control.scrollIntoView({ block: "start" });
    return;
  }

  if (controls.scrollHeight > controls.clientHeight) {
    controls.setAttribute("data-scrollable", "");
    const top = control.getBoundingClientRect().top - controls.getBoundingClientRect().top;
    controls.scrollTo({ top: controls.scrollTop + top });
  }
}

export default function ReaderControls({ children }: { children: React.ReactNode }) {
  const controlsRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const panel = controlsRef.current;
    const content = contentRef.current;
    if (!panel || !content) return;

    const updateOverflow = () => {
      const scrollable = matchMedia("(min-width: 761px)").matches
        && content.offsetHeight > panel.clientHeight + 1;
      panel.toggleAttribute("data-scrollable", scrollable);
      panel.tabIndex = scrollable ? 0 : -1;
    };
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(panel);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={controlsRef} className="readerControls" role="region" aria-label="Reading controls">
      <div ref={contentRef} className="readerControlsContent">{children}</div>
    </div>
  );
}
