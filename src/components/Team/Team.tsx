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
          title="Hablás con quien hace el trabajo."
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
            <article className="member">
              <div className="member__photo">
                <img
                  src={member.photo}
                  alt={`Retrato de ${member.name}`}
                  loading="lazy"
                  decoding="async"
                  width={900}
                  height={1200}
                />
              </div>

              <div className="member__body">
                <h3 className="member__name">{member.name}</h3>
                <p className="member__role">{member.role}</p>
                <p className="member__focus">{member.focus}</p>
                <a
                  className="member__link"
                  href={member.linkedin}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  LinkedIn
                  <span className="sr-only"> de {member.name}</span>
                </a>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
