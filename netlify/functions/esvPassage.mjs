export default async (req) => {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    if (!q) return new Response(JSON.stringify({ error: "Missing q" }), { status: 400 });

    const key = process.env.ESV_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing ESV_API_KEY env var" }), { status: 500 });
    }

    // You can tune options here (include verse numbers, headings, etc.)
    const esvUrl = new URL("https://api.esv.org/v3/passage/text/");
    esvUrl.searchParams.set("q", q);
    esvUrl.searchParams.set("include-footnotes", "false");
    esvUrl.searchParams.set("include-headings", "false");
    esvUrl.searchParams.set("include-verse-numbers", "true");
    esvUrl.searchParams.set("include-passage-references", "false");

    const resp = await fetch(esvUrl.toString(), {
      headers: { Authorization: `Token ${key}` }
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: "ESV API error", detail: t }), { status: 502 });
    }

    const json = await resp.json();
    const text = (json.passages || []).join("\n").trim();

    return new Response(JSON.stringify({ text }), {
      headers: { "content-type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", detail: String(e) }), { status: 500 });
  }
};