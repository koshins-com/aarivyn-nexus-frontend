/**
 * Single HTTP boundary for the NEXUS FastAPI backend.
 *
 * Every network call in this app goes through `api()`. Nothing here
 * synthesises data: if the backend is unreachable or a module is not yet
 * wired up, the caller receives an `ApiError` and the UI renders an honest
 * "not connected" state instead of a plausible-looking number.
 */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Options extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Abort the request after this many ms. Default 45s (NSGA-II is slow). */
  timeoutMs?: number;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { body, timeoutMs = 45_000, headers, ...rest } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof DOMException && err.name === "AbortError";
    throw new ApiError(
      aborted
        ? `Request timed out after ${Math.round(timeoutMs / 1000)}s`
        : `Cannot reach the NEXUS API at ${API_URL}`,
      0,
      path,
    );
  }
  clearTimeout(timer);

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const d = parsed as { detail?: unknown; message?: string } | undefined;
    const msg =
      (typeof d?.detail === "string" && d.detail) ||
      d?.message ||
      `${res.status} ${res.statusText}`;
    throw new ApiError(msg, res.status, path, parsed);
  }

  return parsed as T;
}

export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status === 0 ? err.message : `${err.message} (${err.path})`;
  }
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}
