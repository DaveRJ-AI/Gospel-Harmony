import React from "react";
import { Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import ChapterView from "./pages/ChapterView";
import StoriesIndex from "./pages/StoriesIndex";
import StoryView from "./pages/StoryView";
import TimelineView from "./pages/TimelineView";
import TypeView from "./pages/TypeView";
import ArtView from "./pages/ArtView";
import AboutView from "./pages/AboutView";
import MapView from "./components/map/MapView";
import EsvAttribution from "./components/EsvAttribution";
import SiteHeader from "./components/SiteHeader";
import {
  getEsvDisplayActive,
  getEsvDisplayEventName,
  setEsvDisplayActive,
} from "./lib/esvDisplayState";

export default function App() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [esvDisplayActive, setFooterEsvDisplayActive] = React.useState(
    getEsvDisplayActive()
  );
  const isStoryRoute = location.pathname.startsWith("/story/");
  const isChapterRoute = location.pathname === "/";
  const versionParam = searchParams.get("version");
  const showEsvAttribution =
    esvDisplayActive && (isStoryRoute || isChapterRoute);

  React.useEffect(() => {
    const isEligibleRoute = location.pathname === "/" || location.pathname.startsWith("/story/");
    if (!isEligibleRoute) {
      setEsvDisplayActive(false);
      setFooterEsvDisplayActive(false);
      return;
    }

    if (location.pathname.startsWith("/story/")) {
      const active = versionParam === "ESV";
      setEsvDisplayActive(active);
      setFooterEsvDisplayActive(active);
    }
  }, [location.pathname, versionParam]);

  React.useEffect(() => {
    function handleEsvDisplayChange(event: Event) {
      const customEvent = event as CustomEvent<{ active?: boolean }>;
      setFooterEsvDisplayActive(Boolean(customEvent.detail?.active));
    }

    window.addEventListener(getEsvDisplayEventName(), handleEsvDisplayChange);
    return () =>
      window.removeEventListener(getEsvDisplayEventName(), handleEsvDisplayChange);
  }, []);

  return (
    <div className="container">
      <div className={isChapterRoute || isStoryRoute ? "siteReaderLayout" : undefined}>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<ChapterView />} />
          <Route path="/stories" element={<StoriesIndex />} />
          <Route path="/story/:pericopeId" element={<StoryView />} />
          <Route path="/timeline" element={<TimelineView />} />
          <Route path="/types" element={<TypeView />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/art" element={<ArtView />} />
          <Route path="/about" element={<AboutView />} />
        </Routes>
      </div>

      {showEsvAttribution ? <EsvAttribution /> : null}

      <footer className="siteFooter">
        <div>
          All artwork on Gospel Harmonics was created with the assistance of AI image generation tools.
        </div>
        <div>© 2026 Nascentic, LLC. All rights reserved.</div>
        <div>
          Original site design, code structure, and original artwork may not be
          reproduced without permission.
        </div>
        <div>
          Scripture text rights remain with their respective publishers where
          applicable.
        </div>
      </footer>
    </div>
  );
}
