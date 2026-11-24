import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Reservation } from "../shared/types.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 caractères, sans O/0/I/1

export function newReservationId(): string {
  const bytes = randomBytes(10);
  let id = "YD-";
  for (const b of bytes) id += ALPHABET[b % 32] ?? "A";
  return id;
}

/**
 * Stockage simple dans un fichier JSON (écriture atomique).
 * Convient pour démarrer. Pour la production : remplacez par PostgreSQL (Railway le propose)
 * en gardant la même interface (get / create / save / list).
 */
export class ReservationStore {
  private readonly map = new Map<string, Reservation>();
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {}

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      for (const r of JSON.parse(raw) as Reservation[]) this.map.set(r.id, r);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("[store] lecture impossible, démarrage à vide :", (err as Error).message);
      }
    }
  }

  get(id: string): Reservation | undefined {
    return this.map.get(id);
  }

  list(): Reservation[] {
    return [...this.map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  save(reservation: Reservation): Promise<void> {
    this.map.set(reservation.id, reservation);
    this.chain = this.chain.then(() => this.flush());
    return this.chain;
  }

  private async flush(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify([...this.map.values()], null, 2), "utf8");
      await fs.rename(tmp, this.file);
    } catch (err) {
      // Ne casse pas le service : les données restent en mémoire jusqu'au redémarrage.
      console.warn("[store] écriture impossible (données en mémoire seulement) :", (err as Error).message);
    }
  }
}
