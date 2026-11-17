import type {
  ApiErrorBody,
  Catalog,
  PaymentRequest,
  Reservation,
  ReservationInput,
} from "../shared/types.js";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
  }
  /** Message complet à afficher au client. */
  get full(): string {
    return this.details.length ? `${this.message} ${this.details.join(" ")}` : this.message;
  }
}

async function request<T>(url: string, body?: unknown, timeoutMs = 10_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const init: RequestInit = { signal: ctrl.signal, headers: { Accept: "application/json" } };
    if (body !== undefined) {
      init.method = "POST";
      init.headers = { Accept: "application/json", "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = data as Partial<ApiErrorBody>;
      throw new ApiError(e.error ?? "Une erreur est survenue.", res.status, e.details ?? []);
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw new ApiError("Le serveur met trop de temps à répondre.", 0);
    throw new ApiError("Connexion impossible. Vérifiez votre réseau.", 0);
  } finally {
    clearTimeout(timer);
  }
}

export const loadCatalog = (): Promise<Catalog> => request<Catalog>("/api/catalog");

export const createReservation = async (input: ReservationInput): Promise<Reservation> =>
  (await request<{ reservation: Reservation }>("/api/reservations", input)).reservation;

export const getReservation = async (id: string): Promise<Reservation> =>
  (await request<{ reservation: Reservation }>(`/api/reservations/${encodeURIComponent(id)}`)).reservation;

export const pay = async (req: PaymentRequest): Promise<Reservation> =>
  (await request<{ reservation: Reservation }>("/api/payments", req, 20_000)).reservation;

export const contractUrl = (id: string): string => `/api/reservations/${encodeURIComponent(id)}/contract`;
