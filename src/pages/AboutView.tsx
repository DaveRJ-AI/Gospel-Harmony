import React from "react";

export default function AboutView() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>About Gospel Harmonics</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Gospel Harmonics is a scripture study tool designed to help readers compare
          parallel Gospel passages side by side by chapter, event, timeline, type, and artwork.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Purpose</h3>
        <p style={{ marginTop: 0 }}>
          This site is intended to make Gospel comparison more accessible, visual, and useful
          for study, teaching, and reflection. Users can explore harmonized events across
          Matthew, Mark, Luke, and John, compare wording, review artwork tied to events,
          and navigate the life and ministry of Jesus in multiple ways.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Current Features</h3>
        <ul style={{ marginTop: 0, paddingLeft: 22 }}>
          <li>Chapter View with four parallel Gospel columns</li>
          <li>Event-based harmony browsing</li>
          <li>Timeline and Type filtering</li>
          <li>Artwork thumbnails and viewer</li>
          <li>Responsive study layout</li>
          <li>KJV with optional ESV support where configured</li>
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Version</h3>
        <p style={{ marginTop: 0 }}>
          This release represents a solid V1 foundation. Future versions may include maps,
          location-based browsing, expanded artwork management, and additional study tools.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Copyright and Use</h3>
        <p style={{ marginTop: 0 }}>
          © 2026 Nascentics, LLC. All rights reserved.
        </p>
        <p>
          The original site design, code structure, arrangement, and original artwork created
          for this project may not be reproduced, distributed, or republished without permission.
        </p>
        <p>
          Scripture text rights remain with their respective publishers where applicable.
          Users should respect the rights and terms associated with any non-public-domain
          scripture text or artwork source.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Contact / Notes</h3>
        <p style={{ marginTop: 0 }}>
          This page can be updated later with contact information, acknowledgments,
          licensing details, or formal terms of use.
        </p>
      </div>
    </div>
  );
}