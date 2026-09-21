import { readFile } from "node:fs/promises";
import { glob } from "glob";

async function main(): Promise<void> {
  const files = await glob("src/**/*.{ts,tsx}");
  const oversized: string[] = [];
  for (const file of files) {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/).length;
    if (lines > 400) oversized.push(`${file}: ${lines}`);
  }
  if (oversized.length) {
    console.error(oversized.join("\n"));
    process.exit(1);
  }
}

void main();
