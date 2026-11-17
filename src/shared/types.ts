// Types partagés entre le serveur et le navigateur.

export type Mode = "buy" | "rent";

/** [clé de l'image, taille, position, légende] : recadrage d'une photo. */
export type PhotoCrop = [key: string, size: string, position: string, label: string];

export interface VehicleSpec {
  p: number; // places
  b: string; // boîte
  t: string; // énergie
  k: string; // coffre
}

export interface Vehicle {
  id: number;
  n: string; // nom
  d: string; // description courte
  buy: number; // prix d'achat (FCFA)
  rent: number; // prix par jour (FCFA)
  c: string; // couleur (illustrations)
  ph: PhotoCrop[];
  note: string;
  spec: VehicleSpec;
}

export type DriverReview = [author: string, text: string, rating: number];

export interface Driver {
  id: number;
  n: string;
  y: number; // années d'expérience
  r: string; // note moyenne
  l: string; // langues
  d: string; // description
  rv: DriverReview[];
}

export interface Promo {
  c: number; // id du véhicule
  pct: number;
  end: string; // ISO local
  t: string;
}

export interface PublicConfig {
  whatsapp: string;
  driverFeePerDay: number;
  currency: "FCFA";
}

export interface Catalog {
  vehicles: Vehicle[];
  drivers: Driver[];
  promos: Promo[];
  config: PublicConfig;
}

export interface Customer {
  name: string;
  phone: string;
}

export interface Recipient {
  name: string;
  message: string;
}

export interface ReservationInput {
  vehicleId: number;
  mode: Mode;
  days?: number;
  startDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM : heure de réception du véhicule
  endTime?: string; // HH:MM : heure de retour du véhicule
  withDriver: boolean;
  driverId?: number;
  customer: Customer;
  pickupPlace: string;
  recipient?: Recipient;
  decoration?: string;
  referralCode?: string;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface Quote {
  mode: Mode;
  days: number;
  lines: QuoteLine[];
  total: number;
  currency: "FCFA";
}

export type ReservationStatus = "pending_payment" | "paid_demo" | "pay_at_agency";
export type PaymentMethod = "card" | "orange_money" | "mtn_momo" | "agency";

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  status: "succeeded_demo" | "pending_agency";
  amount: number;
  createdAt: string;
  demo: true;
  phoneMasked?: string;
}

export interface Reservation {
  id: string;
  createdAt: string;
  input: ReservationInput;
  quote: Quote;
  status: ReservationStatus;
  payment?: PaymentRecord;
}

export interface PaymentRequest {
  reservationId: string;
  method: PaymentMethod;
  phone?: string;
}

export interface ApiErrorBody {
  error: string;
  details?: string[];
}
