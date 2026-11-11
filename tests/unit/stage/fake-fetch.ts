import type { Fetch } from "@/lib/stage/github";

export interface RecordedRequest {
  headers: Headers;
  url: string;
}

export interface FakeFetch {
  fetch: Fetch;
  requests: RecordedRequest[];
}

// Each route builds a fresh Response, because a body can only be read once
export type Route = () => Response;

export function fakeFetch(routes: Record<string, Route>): FakeFetch {
  const requests: RecordedRequest[] = [];
  const fetchImpl: Fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    requests.push({ headers: new Headers(init?.headers), url });
    const route = routes[url];
    if (!route) {
      return Promise.reject(new Error(`Unexpected request to ${url}`));
    }
    return Promise.resolve(route());
  };
  return { fetch: fetchImpl, requests };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status
  });
}
