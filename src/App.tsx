import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import ChapterView from "./pages/ChapterView";
import StoriesIndex from "./pages/StoriesIndex";
import StoryView from "./pages/StoryView";
import TimelineView from "./pages/TimelineView";
import TypeView from "./pages/TypeView";

<img
  src="/logo.png"
  alt="Gospel Harmonics logo"
  style={{ width: "40px", height: "40px", objectFit: "contain" }}
/>

function navLinkStyle({ isActive }: { isActive: boolean }) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    textDecoration: "none",
    border: isActive ? "1px solid #6b7280" : "1px solid transparent",
    background: isActive ? "#eef2ff" : "transparent",
    fontWeight: isActive ? 700 : 500,
    color: "inherit",
  } as React.CSSProperties;
}

export default function App() {
  return (
    <div className="container">
      <div className="header">
        <div
          className="brand"
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
        >
          <img
            src={logo}
            alt="Gospel Harmonics logo"
            style={{ width: "40px", height: "40px", objectFit: "contain" }}
          />
          <div>
            <h1 style={{ margin: 0 }}>Gospel Harmonics</h1>
            <small>Chapter + Event parallels in 4 columns</small>
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
        </div>
      </div>

      <Routes>
        <Route path="/" element={<ChapterView />} />
        <Route path="/stories" element={<StoriesIndex />} />
        <Route path="/story/:pericopeId" element={<StoryView />} />
        <Route path="/timeline" element={<TimelineView />} />
        <Route path="/types" element={<TypeView />} />
      </Routes>
    </div>
  );
}