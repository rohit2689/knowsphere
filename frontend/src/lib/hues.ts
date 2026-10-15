// Har platform ka apna pastel rang: tint card ka rang, strong image ke bina wale gradient ka
export const HUES = [
  { tint: '#FFE1EC', strong: '#FFB3D1' },
  { tint: '#D6F8E8', strong: '#9CEBC9' },
  { tint: '#FFF0BF', strong: '#FFD863' },
  { tint: '#D9ECFF', strong: '#9AD2FF' },
  { tint: '#E7DEFF', strong: '#CDBBFF' },
  { tint: '#FFE2D1', strong: '#FFC4A3' },
] as const

export type Hue = (typeof HUES)[number]

// Same naam hamesha same rang deta hai (jaise YouTube hamesha ek hi rang)
export function hueFor(key: string): Hue {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length]!
}
