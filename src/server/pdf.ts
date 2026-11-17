// Mini générateur PDF sans dépendance : texte Helvetica, rectangles, lignes, pagination automatique.

export type RGB = [number, number, number];
export type Align = "left" | "center" | "right";

export const COLORS = {
  navy: [0.043, 0.165, 0.431] as RGB,
  gold: [0.788, 0.647, 0.373] as RGB,
  ink: [0.06, 0.13, 0.23] as RGB,
  gray: [0.36, 0.4, 0.47] as RGB,
  line: [0.82, 0.8, 0.74] as RGB,
  white: [1, 1, 1] as RGB,
  soft: [0.96, 0.945, 0.91] as RGB,
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;

// Largeurs (1/1000 em) des polices Helvetica et Helvetica-Bold, pour couper les lignes proprement.
const parse = (def: string, base: Record<string, number> = {}): Record<string, number> => {
  const out = { ...base };
  for (const tok of def.split(" ")) out[tok.charAt(0)] = Number(tok.slice(1));
  return out;
};
const PUNCT_REG: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191, "(": 333, ")": 333, "*": 389,
  "+": 584, ",": 278, "-": 333, ".": 278, "/": 278, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, "[": 278, "\\": 278, "]": 278, _: 556, "°": 400, "€": 556, "’": 222, "–": 556, "—": 1000, "•": 350,
  "«": 556, "»": 556, "×": 584, "·": 278, "œ": 944, "æ": 889,
};
const PUNCT_BOLD: Record<string, number> = { ...PUNCT_REG, '"': 474, "'": 238, ":": 333, ";": 333, "?": 611, "’": 278, "(": 333 };
const DIGITS = "0556 1556 2556 3556 4556 5556 6556 7556 8556 9556";
const REG = parse(
  `${DIGITS} A667 B667 C722 D722 E667 F611 G778 H722 I278 J500 K667 L556 M833 N722 O778 P667 Q778 R722 S667 T611 U722 V667 W944 X667 Y667 Z611 a556 b556 c500 d556 e556 f278 g556 h556 i222 j222 k500 l222 m833 n556 o556 p556 q556 r333 s500 t278 u556 v500 w722 x500 y500 z500`,
  PUNCT_REG,
);
const BOLD = parse(
  `${DIGITS} A722 B722 C722 D722 E667 F611 G778 H722 I278 J556 K722 L611 M833 N722 O778 P667 Q778 R722 S667 T611 U722 V667 W944 X667 Y667 Z611 a556 b611 c556 d611 e556 f333 g611 h611 i278 j278 k556 l278 m889 n611 o611 p611 q611 r389 s556 t333 u611 v556 w778 x556 y556 z500`,
  PUNCT_BOLD,
);

export function textWidth(s: string, size: number, bold = false): number {
  const table = bold ? BOLD : REG;
  let w = 0;
  for (const ch of s) {
    const base = ch.normalize("NFD").charAt(0);
    w += table[ch] ?? table[base] ?? 556;
  }
  return (w / 1000) * size;
}

// Encodage WinAnsi (cp1252) pour les accents français.
const CP1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94,
  "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99, "œ": 0x9c, "Œ": 0x8c,
};

function enc(s: string): string {
  let out = "";
  for (const ch of s) {
    let c = ch.codePointAt(0) ?? 63;
    if (c === 0x202f || c === 0x2009 || c === 0xa0) c = 0x20;
    let b: number;
    if (c >= 0x20 && c < 0x7f) b = c;
    else if (c >= 0xa1 && c <= 0xff) b = c;
    else if (CP1252[ch] !== undefined) b = CP1252[ch];
    else b = 0x20 <= c && c < 0x7f ? c : 0x3f;
    const chr = String.fromCharCode(b);
    out += chr === "\\" || chr === "(" || chr === ")" ? `\\${chr}` : chr;
  }
  return out;
}

export interface TextOpts {
  size?: number;
  bold?: boolean;
  color?: RGB;
  x?: number;
  width?: number;
  align?: Align;
  lineHeight?: number;
}

export class PdfDoc {
  readonly margin = 50;
  readonly contentWidth = PAGE_W - 100;
  y = 50; // distance depuis le haut de la page
  private readonly pages: string[] = [];
  private cur = "";

  constructor(private readonly meta: { title: string; author: string; footer: string }) {}

  private py(y: number): string {
    return (PAGE_H - y).toFixed(2);
  }
  private col(c: RGB, stroke = false): string {
    return `${c.map((n) => n.toFixed(3)).join(" ")} ${stroke ? "RG" : "rg"}\n`;
  }

  newPage(): void {
    this.pages.push(this.cur);
    this.cur = "";
    this.y = this.margin;
  }
  ensure(h: number): void {
    if (this.y + h > PAGE_H - this.margin - 24) this.newPage();
  }
  gap(n: number): void {
    this.y += n;
  }

  rect(x: number, yTop: number, w: number, h: number, o: { fill?: RGB; stroke?: RGB; lineWidth?: number }): void {
    let ops = "";
    if (o.fill) ops += this.col(o.fill);
    if (o.stroke) ops += this.col(o.stroke, true) + `${o.lineWidth ?? 0.8} w\n`;
    const paint = o.fill && o.stroke ? "B" : o.fill ? "f" : "S";
    this.cur += `${ops}${x.toFixed(2)} ${this.py(yTop + h)} ${w.toFixed(2)} ${h.toFixed(2)} re ${paint}\n`;
  }

  hline(yTop: number, x1: number, x2: number, color: RGB, lw = 0.8): void {
    this.cur += `${this.col(color, true)}${lw} w\n${x1.toFixed(2)} ${this.py(yTop)} m ${x2.toFixed(2)} ${this.py(yTop)} l S\n`;
  }

  /** Dessine une ligne de texte à une position absolue (baseline à `baseY` depuis le haut). */
  textAt(str: string, x: number, baseY: number, o: TextOpts = {}): void {
    const size = o.size ?? 10;
    const bold = o.bold ?? false;
    let px = x;
    if (o.width !== undefined && o.align && o.align !== "left") {
      const w = textWidth(str, size, bold);
      px = o.align === "right" ? x + o.width - w : x + (o.width - w) / 2;
    }
    this.cur += `BT\n${this.col(o.color ?? COLORS.ink)}/${bold ? "F2" : "F1"} ${size} Tf\n${px.toFixed(2)} ${this.py(baseY)} Td\n(${enc(str)}) Tj\nET\n`;
  }

  private wrap(str: string, width: number, size: number, bold: boolean): string[] {
    const lines: string[] = [];
    for (const paragraph of str.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (line && textWidth(test, size, bold) * 1.02 > width) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  /** Paragraphe avec retour à la ligne et saut de page automatiques. */
  para(str: string, o: TextOpts = {}): void {
    const size = o.size ?? 10;
    const lh = o.lineHeight ?? size * 1.45;
    const x = o.x ?? this.margin;
    const width = o.width ?? this.margin + this.contentWidth - x;
    for (const line of this.wrap(str, width, size, o.bold ?? false)) {
      this.ensure(lh);
      this.textAt(line, x, this.y + size, { ...o, x, width });
      this.y += lh;
    }
  }

  heading(str: string): void {
    this.ensure(90); // évite un titre isolé en bas de page
    this.gap(12);
    this.textAt(str.toUpperCase(), this.margin, this.y + 11, { size: 11, bold: true, color: COLORS.navy });
    this.y += 17;
    this.hline(this.y, this.margin, this.margin + this.contentWidth, COLORS.gold, 1.2);
    this.y += 8;
  }

  /** Lignes « libellé : valeur ». */
  rows(items: [string, string][], labelWidth = 150): void {
    const size = 10;
    const lh = size * 1.45;
    for (const [label, value] of items) {
      const lines = this.wrap(value || "-", this.contentWidth - labelWidth, size, false);
      this.ensure(lines.length * lh + 3);
      this.textAt(label, this.margin, this.y + size, { size, bold: true, color: COLORS.gray });
      for (const l of lines) {
        this.textAt(l, this.margin + labelWidth, this.y + size, { size });
        this.y += lh;
      }
      this.y += 3;
    }
  }

  /** Ligne de tableau : libellé à gauche, montant à droite. */
  amountRow(label: string, amount: string, bold = false): void {
    const size = bold ? 11 : 10;
    const lh = size * 1.5;
    const lines = this.wrap(label, this.contentWidth - 140, size, bold);
    this.ensure(lines.length * lh + 6);
    const right = this.margin + this.contentWidth;
    this.textAt(amount, right - 130, this.y + size, { size, bold, width: 130, align: "right" });
    for (const l of lines) {
      this.textAt(l, this.margin, this.y + size, { size, bold });
      this.y += lh;
    }
    this.y += 4;
    this.hline(this.y, this.margin, right, COLORS.line, 0.5);
    this.y += 4;
  }

  finish(): Buffer {
    this.pages.push(this.cur);
    const total = this.pages.length;
    const streams = this.pages.map((content, i) => {
      const save = this.cur;
      this.cur = content;
      this.textAt(this.meta.footer, this.margin, PAGE_H - 28, { size: 8, color: COLORS.gray });
      this.textAt(`Page ${i + 1}/${total}`, this.margin, PAGE_H - 28, { size: 8, color: COLORS.gray, width: this.contentWidth, align: "right" });
      const out = this.cur;
      this.cur = save;
      return out;
    });

    const objects: string[] = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const kids = streams.map((_, i) => `${6 + 2 * i} 0 R`).join(" ");
    objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${total} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = `<< /Title (${enc(this.meta.title)}) /Author (${enc(this.meta.author)}) /Producer (Yamoo Drive) >>`;
    streams.forEach((s, i) => {
      objects[6 + 2 * i] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`;
      objects[7 + 2 * i] = `<< /Length ${s.length} >>\nstream\n${s}endstream`;
    });

    let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets: number[] = [];
    for (let n = 1; n < objects.length; n++) {
      offsets[n] = out.length;
      out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let n = 1; n < objects.length; n++) out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
  }
}
