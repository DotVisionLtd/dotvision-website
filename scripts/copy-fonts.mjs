// Copies the self-hosted Bai Jamjuree woff2 files (brand font, OFL) into public/assets/fonts.
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
const src = "node_modules/@fontsource/bai-jamjuree/files";
const out = "public/assets/fonts";
mkdirSync(out, { recursive: true });
for (const w of ["400", "600", "700"]) for (const sub of ["latin", "latin-ext"]) {
  const f = `bai-jamjuree-${sub}-${w}-normal.woff2`;
  if (existsSync(`${src}/${f}`)) copyFileSync(`${src}/${f}`, `${out}/${f}`);
  else console.warn("missing font file:", f);
}
console.log("fonts copied");
