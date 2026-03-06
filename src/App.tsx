import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import ChapterView from "./pages/ChapterView";
import StoriesIndex from "./pages/StoriesIndex";
import StoryView from "./pages/StoryView";
import TimelineView from "./pages/TimelineView";
import TypeView from "./pages/TypeView";

export default function App() {
  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <h1>Gospel Harmony</h1>
          <small>Chapter + Event parallels in 4 columns</small>
        </div>

        <div className="nav">
          <Link to="/">Chapter View</Link>
          <Link to="/stories">Events</Link>
          <Link to="/timeline">Timeline</Link>
          <Link to="/types">Type</Link>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<ChapterView />} />
        <Route path="/stories" element={<StoriesIndex />} />
        <Route path="/story/:pericopeId" element={<StoryView />} />
        <Route path="/timeline" element={<TimelineView />} />
        <Route path="/types" element={<TypeView />} />
      </Routes>

      <p className="muted" style={{ marginTop: 14 }}>
        Tip: KJV is loaded from <code>/public/data/kjv</code>. ESV uses an API proxy via Netlify Functions.
      </p>
    </div>
  );
}