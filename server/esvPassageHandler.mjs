export async function handleEsvPassageRequest(urlString) {
  try {
    const url = new URL(urlString, "http://localhost");
    const statusOnly =
      url.searchParams.get("status") === "1" ||
      url.pathname.endsWith("/status");

    if (statusOnly) {
      return new Response(
        JSON.stringify({
          available: Boolean(process.env.ESV_API_KEY),
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const q = url.searchParams.get("q");

    if (!q) {
      return new Response(JSON.stringify({ error: "Missing q" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const key = process.env.ESV_API_KEY;
    if (!key) {
      return new Response(
        JSON.stringify({ error: "Missing ESV_API_KEY env var" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const esvUrl = new URL("https://api.esv.org/v3/passage/text/");
    esvUrl.searchParams.set("q", q);
    esvUrl.searchParams.set("include-footnotes", "false");
    esvUrl.searchParams.set("include-headings", "false");
    esvUrl.searchParams.set("include-verse-numbers", "true");
    esvUrl.searchParams.set("include-passage-references", "false");

    const resp = await fetch(esvUrl.toString(), {
      headers: { Authorization: `Token ${key}` },
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(
        JSON.stringify({ error: "ESV API error", detail }),
        {
          status: 502,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const json = await resp.json();
    const text = (json.passages || []).join("\n").trim();

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Server error", detail: String(error) }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
