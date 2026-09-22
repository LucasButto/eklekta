import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";
import teamData from "@/data/team.json";
import type { TeamMember } from "@/types";
import "./Team.scss";

const team = teamData as TeamMember[];

export function Team() {
  return (
    <section className="team" id="equipo">
      <div className="team__inner">
        <SectionHeading
          align="center"
          className="team__heading"
          title={
            <>
              {/* Two anchored lines with a brand slab filling the room
                  each one leaves — first line left, its slab running off
                  the right; second line right, its slab off the left.
                  See .team__line in Team.scss; below $bp-md it collapses
                  back to a plain centred stack. */}
              <span className="team__line team__line--start">
                Hablás con quien
              </span>
              <span className="team__line team__line--end">
                hace el trabajo.
              </span>
            </>
          }
          intro="Somos un equipo chico y sin intermediarios. La persona que te presenta la propuesta es la misma que después la construye."
        />
      </div>

      <ul className="team__row">
        {team.map((member, index) => (
          <Reveal
            as="li"
            className="team__cell"
            key={member.id}
            delay={index * 80}
          >
            {/* The whole card is the link to the person's LinkedIn. The
                picture fills the frame and the caption sits inside it —
                over the photo from $bp-lg, on a panel under it below
                that. member.focus is deliberately left off for now; it
                stays in team.json and the TeamMember type. */}
            <a
              className="member"
              href={member.linkedin}
              target="_blank"
              rel="noreferrer noopener"
            >
              <div className="member__photo">
                <img
                  src={member.photo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={900}
                  height={1200}
                />

                {/* The only visible sign the card is a link — no
                    underline, no button. Fades in top-right on hover /
                    keyboard focus; the external-link glyph (framed box
                    with a break-out arrow). See .member__cue. */}
                <span className="member__cue" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" focusable="false">
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 3h6v6M10 14 21 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div className="member__body">
                  <h3 className="member__name">{member.name}</h3>
                  <p className="member__role">{member.role}</p>
                  <span className="sr-only">. Abrir su perfil de LinkedIn.</span>
                </div>
              </div>
            </a>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
