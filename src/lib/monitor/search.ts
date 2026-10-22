import "server-only";

// Web search for leak candidates. Uses the Brave Search API (https://brave.com/search/api).
// Returns page URLs only. Nothing is downloaded from the result pages.

export type SearchHit = { url: string; title: string };

export function searchEnabled(): boolean {
  return !!process.env.BRAVE_SEARCH_API_KEY;
}

export async function searchWeb(query: string, count = 20): Promise<SearchHit[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(count, 20)));
  url.searchParams.set("safesearch", "off"); // leak pages are filtered out by safe search
  url.searchParams.set("country", "us");

  const res = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 429) throw new Error("Search rate limit reached");
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);

  const json = (await res.json()) as { web?: { results?: { url: string; title: string }[] } };
  return (json.web?.results ?? []).map((r) => ({ url: r.url, title: r.title }));
}
