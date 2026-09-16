const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

export const MAX_IMAGE_FILE_BYTES = 2 * 1024 * 1024
export const MAX_SAVE_FILE_BYTES = 2 * 1024 * 1024

const DATA_IMAGE_PATTERN = /^data:(image\/(?:png|jpe?g|gif|webp));base64,[a-z0-9+/=]+$/i

function hasExpectedImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === 'image/png') {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  }
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (type === 'image/gif') {
    const signature = String.fromCharCode(...bytes.slice(0, 6))
    return signature === 'GIF87a' || signature === 'GIF89a'
  }
  if (type === 'image/webp') {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

export async function validateImageFile(file: File): Promise<string | null> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return 'Use a PNG, JPEG, GIF, or WebP image.'
  if (file.size === 0 || file.size > MAX_IMAGE_FILE_BYTES) return 'Image files must be 2 MB or smaller.'

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  return hasExpectedImageSignature(bytes, file.type) ? null : 'That file does not match its declared image type.'
}

/** Keeps persisted/imported image values local and inert. */
export function sanitizeImageSource(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_FILE_BYTES * 1.4) return null
  if (DATA_IMAGE_PATTERN.test(value)) return value
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}
