// Helpers para resolver URLs de fotos desde storage_path.
// Mientras no haya fotos reales subidas, los paths "placeholders/..." mapean
// a URLs de Unsplash. Cuando se suban reales, devuelve la URL pública del CDN.

const PLACEHOLDER_PHOTOS: Record<string, string> = {
  "placeholders/apart-1.jpg":
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
  "placeholders/apart-2.jpg":
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80",
  "placeholders/apart-3.jpg":
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
  "placeholders/cabana-1.jpg":
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
  "placeholders/cabana-2.jpg":
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=80",
};

const FALLBACK_PLACEHOLDER =
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1600&q=80";

/**
 * Devuelve la URL pública absoluta para un storage_path.
 * - Si es un placeholder conocido, devuelve la URL Unsplash mapeada.
 * - Si es un path real, construye la URL del CDN de Supabase Storage.
 */
export function getFotoUrl(storagePath: string): string {
  if (storagePath in PLACEHOLDER_PHOTOS) {
    return PLACEHOLDER_PHOTOS[storagePath];
  }
  if (storagePath.startsWith("placeholders/")) {
    return FALLBACK_PLACEHOLDER;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return FALLBACK_PLACEHOLDER;

  return `${baseUrl}/storage/v1/object/public/hospedajes/${storagePath}`;
}

/** URL pública para una foto del bucket `destinos`. */
export function getDestinoFotoUrl(storagePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return FALLBACK_PLACEHOLDER;
  return `${baseUrl}/storage/v1/object/public/destinos/${storagePath}`;
}
