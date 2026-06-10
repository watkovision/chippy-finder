import { useQuery } from "@tanstack/react-query";
import type {
  QueryFunction,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";

export interface HealthStatus {
  status: string;
}

export type ChipShopNation =
  (typeof ChipShopNation)[keyof typeof ChipShopNation];

export const ChipShopNation = {
  england: "england",
  wales: "wales",
  scotland: "scotland",
  unknown: "unknown",
} as const;

export interface ChipShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMetres: number;
  address?: string | null;
  postcode?: string | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: string | null;
  hygieneRating?: number | null;
  hygieneRatingLabel?: string | null;
  hygieneRatingDate?: string | null;
  localAuthority?: string | null;
  cuisine?: string | null;
  nation: ChipShopNation;
}

export interface NearbySummary {
  totalFound: number;
  searchRadiusMetres: number;
  topRatedCount: number;
  averageDistanceMetres?: number | null;
  nearestName?: string | null;
  nearestDistanceMetres?: number | null;
  funFact: string;
}

export interface ApiError {
  error: string;
}

export type ListNearbyChipShopsParams = {
  lat: number;
  lng: number;
  radius?: number;
};

export type GetNearbySummaryParams = {
  lat: number;
  lng: number;
  radius?: number;
};

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiClientError<T>;
export type BodyType<T> = T;
export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  if (!url.startsWith("/")) return input;
  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => { headers.set(key, value); });
  }
  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(mediaType && (mediaType.startsWith("text/") || mediaType === "application/xml" || mediaType === "text/xml" || mediaType.endsWith("+xml") || mediaType === "application/x-www-form-urlencoded"));
}

function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;
  if (typeof data === "string") { const text = data.trim(); return text ? `${prefix}: ${truncate(text)}` : prefix; }
  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message = getStringField(data, "message") ?? getStringField(data, "error_description") ?? getStringField(data, "error");
  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;
  return prefix;
}

export class ApiClientError<T = unknown> extends Error {
  readonly name = "ApiClientError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  constructor(response: Response, data: T | null, requestInfo: { method: string; url: string }) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);
    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) return null;
  const mediaType = getMediaType(response.headers);
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }
  const raw = await response.text();
  const normalized = stripBom(raw);
  if (normalized.trim() === "") return null;
  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) { try { return JSON.parse(normalized); } catch { return raw; } }
  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);
  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseJsonBody(response: Response, requestInfo: { method: string; url: string }): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);
  if (normalized.trim() === "") return null;
  try { return JSON.parse(normalized); } catch (cause) { throw new Error(`Failed to parse JSON from ${requestInfo.method} ${requestInfo.url}: ${cause}`); }
}

async function parseSuccessBody(response: Response, responseType: "json" | "text" | "blob" | "auto", requestInfo: { method: string; url: string }): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) return null;
  const effectiveType = responseType === "auto" ? inferResponseType(response) : responseType;
  switch (effectiveType) {
    case "json": return parseJsonBody(response, requestInfo);
    case "text": { const text = await response.text(); return text === "" ? null : text; }
    case "blob": if (typeof response.blob !== "function") { throw new TypeError("Blob responses are not supported in this runtime."); } return response.blob();
  }
}

export async function customFetch<T = unknown>(input: RequestInfo | URL, options: CustomFetchOptions = {}): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;
  const method = resolveMethod(input, init.method);
  if (init.body != null && (method === "GET" || method === "HEAD")) throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);
  if (typeof init.body === "string" && !headers.has("content-type") && looksLikeJson(init.body)) headers.set("content-type", "application/json");
  if (responseType === "json" && !headers.has("accept")) headers.set("accept", DEFAULT_JSON_ACCEPT);
  if (_authTokenGetter && !headers.has("authorization")) { const token = await _authTokenGetter(); if (token) headers.set("authorization", `Bearer ${token}`); }
  const requestInfo = { method, url: resolveUrl(input) };
  const response = await fetch(input, { ...init, method, headers });
  if (!response.ok) { const errorData = await parseErrorBody(response, method); throw new ApiClientError(response, errorData, requestInfo); }
  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];

export const getHealthCheckUrl = () => `/api/healthz`;
export const healthCheck = async (options?: RequestInit): Promise<HealthStatus> => customFetch<HealthStatus>(getHealthCheckUrl(), { ...options, method: "GET" });
export const getHealthCheckQueryKey = () => [`/api/healthz`] as const;
export const getHealthCheckQueryOptions = <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>; request?: SecondParameter<typeof customFetch>; }) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getHealthCheckQueryKey();
  const queryFn: QueryFunction<Awaited<ReturnType<typeof healthCheck>>> = ({ signal }) => healthCheck({ signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & { queryKey: QueryKey };
};
export function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>; request?: SecondParameter<typeof customFetch>; }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getHealthCheckQueryOptions(options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

export const getListNearbyChipShopsUrl = (params: ListNearbyChipShopsParams) => {
  const normalizedParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => { if (value !== undefined) normalizedParams.append(key, value === null ? "null" : value.toString()); });
  const stringifiedParams = normalizedParams.toString();
  return stringifiedParams.length > 0 ? `/api/chipshops/nearby?${stringifiedParams}` : `/api/chipshops/nearby`;
};
export const listNearbyChipShops = async (params: ListNearbyChipShopsParams, options?: RequestInit): Promise<ChipShop[]> => customFetch<ChipShop[]>(getListNearbyChipShopsUrl(params), { ...options, method: "GET" });
export const getListNearbyChipShopsQueryKey = (params?: ListNearbyChipShopsParams) => [`/api/chipshops/nearby`, ...(params ? [params] : [])] as const;
export const getListNearbyChipShopsQueryOptions = <TData = Awaited<ReturnType<typeof listNearbyChipShops>>, TError = ErrorType<ApiError>>(params: ListNearbyChipShopsParams | undefined, options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listNearbyChipShops>>, TError, TData>; request?: SecondParameter<typeof customFetch>; }) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListNearbyChipShopsQueryKey(params);
  const queryFn: QueryFunction<Awaited<ReturnType<typeof listNearbyChipShops>>> = ({ signal }) => listNearbyChipShops(params!, { signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof listNearbyChipShops>>, TError, TData> & { queryKey: QueryKey };
};
export function useListNearbyChipShops<TData = Awaited<ReturnType<typeof listNearbyChipShops>>, TError = ErrorType<ApiError>>(params: ListNearbyChipShopsParams | undefined, options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof listNearbyChipShops>>, TError, TData>; request?: SecondParameter<typeof customFetch>; }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getListNearbyChipShopsQueryOptions(params, options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

export const getGetNearbySummaryUrl = (params: GetNearbySummaryParams) => {
  const normalizedParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => { if (value !== undefined) normalizedParams.append(key, value === null ? "null" : value.toString()); });
  const stringifiedParams = normalizedParams.toString();
  return stringifiedParams.length > 0 ? `/api/chipshops/summary?${stringifiedParams}` : `/api/chipshops/summary`;
};
export const getNearbySummary = async (params: GetNearbySummaryParams, options?: RequestInit): Promise<NearbySummary> => customFetch<NearbySummary>(getGetNearbySummaryUrl(params), { ...options, method: "GET" });
export const getGetNearbySummaryQueryKey = (params?: GetNearbySummaryParams) => [`/api/chipshops/summary`, ...(params ? [params] : [])] as const;
export const getGetNearbySummaryQueryOptions = <TData = Awaited<ReturnType<typeof getNearbySummary>>, TError = ErrorType<ApiError>>(params: GetNearbySummaryParams | undefined, options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getNearbySummary>>, TError, TData>; request?: SecondParameter<typeof customFetch>; }) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetNearbySummaryQueryKey(params);
  const queryFn: QueryFunction<Awaited<ReturnType<typeof getNearbySummary>>> = ({ signal }) => getNearbySummary(params!, { signal, ...requestOptions });
  return { queryKey, queryFn, ...queryOptions } as UseQueryOptions<Awaited<ReturnType<typeof getNearbySummary>>, TError, TData> & { queryKey: QueryKey };
};
export function useGetNearbySummary<TData = Awaited<ReturnType<typeof getNearbySummary>>, TError = ErrorType<ApiError>>(params: GetNearbySummaryParams | undefined, options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getNearbySummary>>, TError, TData>; request?: SecondParameter<typeof customFetch>; }): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetNearbySummaryQueryOptions(params, options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}
