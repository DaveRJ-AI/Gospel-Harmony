import React from "react";
import type { Gospel, Version } from "../lib/refs";
import { GOSPELS } from "../lib/refs";

export default function BookChapterPicker(props: {
  version: Version;
  setVersion: (v: Version) => void;
  book: Gospel;
  setBook: (b: Gospel) => void;
  chapter: number;
  setChapter: (c: number) => void;
}) {
  const { version, setVersion, book, setBook, chapter, setChapter } = props;

  return (
    <div className="card">
      <div className="row">
        <div>
          <label>Version</label>
          <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
            <option value="KJV">KJV (local)</option>
            <option value="ESV">ESV (API)</option>
          </select>
        </div>

        <div>
          <label>Primary Gospel</label>
          <select value={book} onChange={(e) => setBook(e.target.value as Gospel)}>
            {GOSPELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Chapter</label>
          <input
            type="number"
            min={1}
            value={chapter}
            onChange={(e) => setChapter(Math.max(1, Number(e.target.value || 1)))}
          />
        </div>
      </div>

      {version === "ESV" ? (
        <p className="muted" style={{ marginTop: 10 }}>
          ESV requires an API key set in Netlify as <code>ESV_API_KEY</code>.
        </p>
      ) : null}
    </div>
  );
}