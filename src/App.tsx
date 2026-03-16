import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import ChapterView from "./pages/ChapterView";
import StoriesIndex from "./pages/StoriesIndex";
import StoryView from "./pages/StoryView";
import TimelineView from "./pages/TimelineView";
import TypeView from "./pages/TypeView";
import ArtView from "./pages/ArtView";
import AboutView from "./pages/AboutView";

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
            Type
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
        <Route path="/art" element={<ArtView />} />
        <Route path="/about" element={<AboutView />} />
      </Routes>

      <footer className="siteFooter">
        <div>© 2026 Gospel Harmonics. All rights reserved.</div>
        <div>
          Original site design, code structure, and original artwork may not be reproduced without permission.
        </div>
        <div>
          Scripture text rights remain with their respective publishers where applicable.
        </div>
      </footer>
    </div>
  );
}