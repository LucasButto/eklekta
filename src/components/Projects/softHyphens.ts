/**
 * Marks where a Spanish word may be split at the end of a line, with soft
 * hyphens (U+00AD). A card title keeps one size for every project, so a
 * word wider than its measure ("LIQUIDACIONES" beside the phone) has to
 * break instead of shrinking — and these are the only places it may. The
 * browser uses them only when the word cannot fit a line whole (see
 * .project-card__word), so a name that fits never shows a hyphen.
 *
 * Plain syllable rules, enough for display titles: vowels in a row are
 * never split (not even a hiatus — the RAE advises against it at a line
 * end); between vowels one consonant opens the next syllable, two are
 * split unless they make an onset (pl, tr…), and from three on the onset
 * (or the last consonant) moves on. ch, ll and rr are one consonant.
 */

const SHY = '­'
const VOWELS = 'aeiouáéíóúü'
const ONSETS = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr'])
const DIGRAPHS = new Set(['ch', 'll', 'rr'])
/** Letters left on each side of a break: no "LI-" and no "-ES". */
const MIN_PART = 3

export function softHyphenate(word: string): string {
  const lower = word.toLowerCase()
  if (lower.length !== word.length || word.length < MIN_PART * 2) return word

  const units: { start: number; text: string; vowel: boolean }[] = []
  for (let i = 0; i < lower.length; ) {
    const pair = lower.slice(i, i + 2)
    const text = DIGRAPHS.has(pair) ? pair : lower[i]
    units.push({ start: i, text, vowel: VOWELS.includes(text) })
    i += text.length
  }

  const breaks: number[] = []
  let last = -1 // the previous vowel's unit
  units.forEach((unit, k) => {
    if (!unit.vowel) return
    const between = units.slice(last + 1, k)
    const n = between.length
    if (last >= 0 && n > 0) {
      if (n === 1) {
        breaks.push(between[0].start)
      } else {
        const onset = ONSETS.has(between[n - 2].text + between[n - 1].text)
        breaks.push(between[onset ? n - 2 : n - 1].start)
      }
    }
    last = k
  })

  let out = ''
  let from = 0
  for (const at of breaks) {
    if (at < MIN_PART || word.length - at < MIN_PART) continue
    out += word.slice(from, at) + SHY
    from = at
  }
  return out + word.slice(from)
}
