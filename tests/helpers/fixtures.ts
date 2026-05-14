import fs from "node:fs/promises";
import path from "node:path";

const FIXTURES_DIR = path.resolve("tests/fixtures");

export async function ensurePhotoFixtures(count = 5): Promise<string[]> {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  const paths: string[] = [];
  for (let i = 1; i <= count; i++) {
    const filePath = path.join(FIXTURES_DIR, `foto-${i}.jpg`);
    paths.push(filePath);

    try {
      const stat = await fs.stat(filePath);
      if (stat.size > 10_000) continue; // ya existe y no está vacío
    } catch {
      // doesn't exist, download
    }

    const seed = `lasgaviotas-${i}`;
    const url = `https://picsum.photos/seed/${seed}/1600/1200.jpg`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fixture download failed: ${url} → ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filePath, buf);
  }

  return paths;
}
