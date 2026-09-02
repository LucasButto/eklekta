import { About } from "@/components/About/About";
import { Contact } from "@/components/Contact/Contact";
import { Footer } from "@/components/Footer/Footer";
import { Hero } from "@/components/Hero/Hero";
import { Manifesto } from "@/components/Manifesto/Manifesto";
import { Navbar } from "@/components/Navbar/Navbar";
import { Process } from "@/components/Process/Process";
import { Projects } from "@/components/Projects/Projects";
// import { ProjectsRibbon } from "@/components/ProjectsRibbon/ProjectsRibbon";
import { Services } from "@/components/Services/Services";
import { Team } from "@/components/Team/Team";
import { ThemeProvider } from "@/context/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <Navbar />

      {/* `page` is the curtain half of the footer reveal — it rides
          over the pinned footer and uncovers it. See Footer.scss. */}
      <main className="page" id="contenido">
        <Hero />
        {/* <ProjectsRibbon /> */}
        <About />
        <Services />
        <Projects />
        <Team />
        <Process />
        <Manifesto />
        <Contact />
      </main>

      <Footer />
    </ThemeProvider>
  );
}
