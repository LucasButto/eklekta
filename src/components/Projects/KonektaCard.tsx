/**
 * The CRM tab shows one thing: konekta, eklekta's own CRM. Not a case
 * study — a single full-width panel, the wordmark set on a celeste-cyan
 * field the way the hero sets "eklekta." on violet. The whole panel is
 * a link to the contact section.
 */
export function KonektaCard() {
  return (
    <a className="konekta" href="#contacto">
      <span className="konekta__eyebrow">CRM</span>
      <span className="konekta__word">konekta.</span>
      <span className="konekta__link">
        El CRM de eklekta
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path
            d="M4 10h11M11 5.5 15.5 10 11 14.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </a>
  )
}
