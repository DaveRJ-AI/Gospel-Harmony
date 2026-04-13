import React from "react";
import { NavLink, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import ChapterView from "./pages/ChapterView";
import StoriesIndex from "./pages/StoriesIndex";
import StoryView from "./pages/StoryView";
import TimelineView from "./pages/TimelineView";
import TypeView from "./pages/TypeView";
import ArtView from "./pages/ArtView";
import AboutView from "./pages/AboutView";
import MapView from "./components/map/MapView";
import EsvAttribution from "./components/EsvAttribution";
import {
  getEsvDisplayActive,
  getEsvDisplayEventName,
  setEsvDisplayActive,
} from "./lib/esvDisplayState";

function navLinkStyle({ isActive }: { isActive: boolean }) {
  return {
    padding: "10px 16px",
    borderRadius: 999,
    textDecoration: "none",
    border: isActive ? "1px solid #94A3B8" : "1px solid transparent",
    background: isActive ? "#EEF4FF" : "transparent",
    fontWeight: isActive ? 800 : 600,
    color: "#0F172A",
    transition: "all 140ms ease",
  } as React.CSSProperties;
}

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
      <div className="header">
        <div
          className="brand"
          style={{ display: "flex", alignItems: "center", gap: "18px" }}
        >
          <img
            src="/logo.png"
            alt="Gospel Harmonics logo"
            style={{ width: "80px", height: "80px", objectFit: "contain" }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: "2.15rem", lineHeight: 1.05 }}>
              Gospel Harmonics
            </h1>
            <small style={{ fontSize: "1rem" }}>
              Chapter + Event parallels in 4 columns
            </small>
          </div>
        </div>

        <div
          className="nav"
          style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
        >
          <NavLink to="/" end style={navLinkStyle}>
            Chapter View
          </NavLink>
          <NavLink to="/stories" style={navLinkStyle}>
            Events
          </NavLink>
          <NavLink to="/timeline" style={navLinkStyle}>
            Timeline
          </NavLink>
          <NavLink to="/types" style={navLinkStyle}>
            Themes
          </NavLink>
          <NavLink to="/map" style={navLinkStyle}>
            Map
          </NavLink>
          <NavLink to="/art" style={navLinkStyle}>
            Art
          </NavLink>
          <NavLink to="/about" style={navLinkStyle}>
            About
          </NavLink>
        </div>
      </div>

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

      {showEsvAttribution ? <EsvAttribution /> : null}

      <footer className="siteFooter">
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
