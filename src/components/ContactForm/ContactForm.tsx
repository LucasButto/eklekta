import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/Button/Button";
import servicesData from "@/data/services.json";
import site from "@/data/site.json";
import type { Service, SiteData } from "@/types";
import { ServiceSelect } from "./ServiceSelect";
import "./ContactForm.scss";

const data = site as SiteData;
const services = servicesData as Service[];

type FieldName = "nombre" | "email" | "mensaje";
type Errors = Partial<Record<FieldName, string>>;

/**
 * idle → sending → sent | error | limited, plus `mail` for the no-endpoint
 * path. `limited` is the server's 429: it has its own message because
 * "try again" is useful advice there and misleading for any other error.
 */
type Status = "idle" | "sending" | "sent" | "error" | "limited" | "mail";

/**
 * The send button's own little story, apart from `status` (which stays put
 * and feeds the line beside the button): label → a loading bar → the
 * result, held for a moment, → label again.
 *
 *   idle      "Enviar mensaje"
 *   loading   the label leaves upward, a bar fills (it only ever fakes
 *             progress: it crawls toward the end and waits there for the
 *             real answer)
 *   finishing the bar runs the last stretch once the answer is in
 *   success   green, the sent message
 *   error     red, the error message
 */
type Phase = "idle" | "loading" | "finishing" | "success" | "error";

/** The bar is on screen at least this long, however fast the server is. */
const MIN_LOAD_MS = 1700;
/** The last stretch of the bar, once the answer is in. */
const FINISH_MS = 320;
/** How long the result holds before the button goes back to normal. */
const RESULT_MS = 3400;
/** The bar's slow crawl while the request is out. */
const CRAWL_MS = 3200;
const CRAWL_TO = 0.9;
/** How long the label takes to roll back in. */
const RETURN_MS = 500;

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function MailIcon() {
  return (
    <svg
      className="send__icon"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2.75"
        y="4.25"
        width="14.5"
        height="11.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m3.5 5.5 6.5 5 6.5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Values {
  nombre: string;
  email: string;
  interes: string;
  mensaje: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate({ nombre, email, mensaje }: Values): Errors {
  const errors: Errors = {};
  if (nombre.trim().length < 2) errors.nombre = "Decinos cómo te llamás.";
  if (!email.trim()) errors.email = "Necesitamos un email para responderte.";
  else if (!EMAIL.test(email.trim()))
    errors.email = "Ese email no parece válido.";
  if (mensaje.trim().length < 10)
    errors.mensaje = "Contanos en un par de líneas qué necesitás.";
  return errors;
}

/** Everything the visitor typed, folded into a prefilled email. */
function mailtoHref(values: Values) {
  const subject = values.interes
    ? `Consulta · ${values.interes}`
    : "Consulta desde el sitio";
  const body = [
    `Nombre: ${values.nombre}`,
    `Email: ${values.email}`,
    values.interes ? `Interés: ${values.interes}` : null,
    "",
    values.mensaje,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `mailto:${data.contact.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function ContactForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  // ---- the send button's phases ----------------------------------------
  const [phase, setPhase] = useState<Phase>("idle");
  // Which result the button last showed, kept after it leaves so its text
  // does not change while it rolls away.
  const [result, setResult] = useState<"success" | "error">("success");
  const [returning, setReturning] = useState(false);
  // The stage's width in px once measured; null until then (and in the
  // pre-rendered HTML), when the label alone holds the button open.
  const [stageW, setStageW] = useState<number | null>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const alive = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      for (const timer of pending) window.clearTimeout(timer);
    };
  }, []);

  // The button keeps the label's width through every phase: the bar and
  // the short result ("Enviado", "Error") sit inside it, so nothing around
  // the button moves.
  useLayoutEffect(() => {
    const node = labelRef.current;
    if (!node) return;
    const measure = () =>
      setStageW(Math.ceil(node.getBoundingClientRect().width));
    measure();
    // The text changes size when the web font arrives, and with the window;
    // the stage follows it.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The bar. A real animation, not a CSS one: it has to be handed from its
  // slow crawl to its last stretch from wherever the crawl had got to, and
  // a CSS animation cannot be picked up mid-way.
  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    if (phase === "loading") {
      const crawl = fill.animate(
        [{ transform: "scaleX(0)" }, { transform: `scaleX(${CRAWL_TO})` }],
        {
          duration: CRAWL_MS,
          easing: "cubic-bezier(0.2, 0.65, 0.3, 1)",
          fill: "forwards",
        },
      );
      return () => crawl.cancel();
    }
    if (phase === "finishing") {
      const from = new DOMMatrix(getComputedStyle(fill).transform).a;
      const run = fill.animate(
        [
          { transform: `scaleX(${from})` },
          { transform: "scaleX(1)" },
        ],
        { duration: FINISH_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
      );
      return () => run.cancel();
    }
  }, [phase]);

  const endpoint = data.contact.formEndpoint?.trim();
  const field = (name: string) => `${id}-${name}`;
  const errorId = (name: FieldName) => `${id}-${name}-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const raw = new FormData(form);

    // Honeypot: a real visitor never sees this field, so anything in it
    // is a bot. Report success rather than an error — telling a bot it
    // failed just invites a retry.
    if ((raw.get("empresa") as string)?.trim()) {
      setStatus("sent");
      form.reset();
      return;
    }

    const values: Values = {
      nombre: String(raw.get("nombre") ?? ""),
      email: String(raw.get("email") ?? ""),
      interes: String(raw.get("interes") ?? ""),
      mensaje: String(raw.get("mensaje") ?? ""),
    };

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Send focus to the first field that needs fixing, so a keyboard
      // or screen-reader user lands on the problem instead of hunting.
      const first = (["nombre", "email", "mensaje"] as FieldName[]).find(
        (name) => found[name],
      );
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    if (!endpoint) {
      window.location.href = mailtoHref(values);
      setStatus("mail");
      return;
    }

    setStatus("sending");
    setPhase("loading");
    const started = performance.now();
    let outcome: "sent" | "limited" | "error" = "error";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // `empresa` is always empty by this point (a filled one returned
        // above) but goes along anyway so the server runs its own
        // honeypot check too — it can't trust that the client did.
        body: JSON.stringify({ ...values, empresa: String(raw.get("empresa") ?? "") }),
      });
      if (response.status === 429) {
        outcome = "limited";
        throw new Error("429");
      }
      // Requiring `ok: true` in the body, not just a 2xx: a server that
      // answers with something other than our endpoint (an HTML fallback
      // page, say) must not read as "sent".
      const result: unknown = await response.json().catch(() => null);
      const accepted =
        typeof result === "object" &&
        result !== null &&
        (result as { ok?: unknown }).ok === true;
      if (!response.ok || !accepted) throw new Error(String(response.status));
      outcome = "sent";
    } catch {
      // `limited` was set on the way in; anything else is a plain error.
    }

    // The bar gets its time on screen, then its last stretch, whatever the
    // server's speed; only then does the answer show.
    await wait(Math.max(0, MIN_LOAD_MS - (performance.now() - started)));
    if (!alive.current) return;
    setPhase("finishing");
    await wait(FINISH_MS);
    if (!alive.current) return;

    setStatus(outcome);
    if (outcome === "sent") form.reset();
    setResult(outcome === "sent" ? "success" : "error");
    setPhase(outcome === "sent" ? "success" : "error");

    // …held, then back to the label.
    timers.current.push(
      window.setTimeout(() => {
        setReturning(true);
        setPhase("idle");
        timers.current.push(
          window.setTimeout(() => setReturning(false), RETURN_MS),
        );
      }, RESULT_MS),
    );
  }

  /** Clears a field's error as soon as the visitor starts fixing it. */
  const clearError = (name: FieldName) => () =>
    setErrors((current) =>
      current[name] ? { ...current, [name]: undefined } : current,
    );

  /** One ruled row: small-caps label left, control right. */
  const describedBy = (name: FieldName) =>
    errors[name] ? errorId(name) : undefined;

  const errorFor = (name: FieldName) =>
    errors[name] ? (
      <p className="contact-form__error" id={errorId(name)}>
        {errors[name]}
      </p>
    ) : null;

  const fieldProps = (name: FieldName) => ({
    className: "contact-form__field",
    "data-invalid": errors[name] ? true : undefined,
  });

  return (
    <form
      className="contact-form"
      ref={formRef}
      onSubmit={handleSubmit}
      // Native bubbles are browser-styled and browser-language; the
      // messages below are ours and match the rest of the page's voice.
      noValidate
    >
      <div {...fieldProps("nombre")}>
        <label htmlFor={field("nombre")}>Nombre</label>
        <input
          id={field("nombre")}
          name="nombre"
          type="text"
          autoComplete="name"
          placeholder="Cómo te llamás"
          aria-invalid={errors.nombre ? true : undefined}
          aria-describedby={describedBy("nombre")}
          onInput={clearError("nombre")}
        />
        {errorFor("nombre")}
      </div>

      <div {...fieldProps("email")}>
        <label htmlFor={field("email")}>Email</label>
        <input
          id={field("email")}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@empresa.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy("email")}
          onInput={clearError("email")}
        />
        {errorFor("email")}
      </div>

      <div className="contact-form__field">
        <label id={field("interes-label")}>Qué necesitás</label>
        <ServiceSelect
          name="interes"
          labelId={field("interes-label")}
          placeholder="Seleccione un servicio"
          options={[...services.map((s) => s.title), "Otro"]}
        />
      </div>

      <div {...fieldProps("mensaje")}>
        <label htmlFor={field("mensaje")}>Mensaje</label>
        <textarea
          id={field("mensaje")}
          name="mensaje"
          rows={3}
          placeholder="Contanos qué te está costando más de lo que debería."
          aria-invalid={errors.mensaje ? true : undefined}
          aria-describedby={describedBy("mensaje")}
          onInput={clearError("mensaje")}
        />
        {errorFor("mensaje")}
      </div>

      {/* Honeypot. Hidden from sight, from the tab order and from the
          accessibility tree — only a bot filling every input finds it. */}
      <div className="contact-form__trap" aria-hidden="true">
        <label htmlFor={field("empresa")}>No completar</label>
        <input
          id={field("empresa")}
          name="empresa"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="contact-form__foot">
        {/* One button, four layers in one clipped stage: the label, the
            bar, the result. Each rolls up and out as the next rolls in
            from below (see .send in ContactForm.scss). The layers are
            hidden from assistive tech; the button's own label carries the
            state, and the status line below it carries the full text. */}
        <Button
          type="submit"
          className="contact-form__send"
          withArrow={false}
          disabled={phase !== "idle"}
          data-phase={phase}
          data-returning={returning ? "" : undefined}
          aria-busy={phase === "loading" || phase === "finishing"}
          aria-label={
            phase === "loading" || phase === "finishing"
              ? "Enviando…"
              : phase === "success"
                ? "Enviado"
                : phase === "error"
                  ? "Error"
                  : "Enviar mensaje"
          }
        >
          <span
            className="send__stage"
            data-ready={stageW !== null ? "" : undefined}
            style={stageW !== null ? { width: `${stageW}px` } : undefined}
            aria-hidden="true"
          >
            <span className="send__layer send__layer--label">
              <span className="send__text" ref={labelRef}>
                <MailIcon />
                Enviar mensaje
              </span>
            </span>
            <span className="send__layer send__layer--loading">
              <span className="send__bar">
                <span className="send__fill" ref={fillRef} />
              </span>
            </span>
            <span className="send__layer send__layer--result">
              <span className="send__text">
                {result === "success" ? "Enviado" : "Error"}
              </span>
            </span>
          </span>
        </Button>

        {/* Polite, so the result is announced without cutting off
            whatever the screen reader is already saying. */}
        <p className="contact-form__status" role="status" aria-live="polite">
          {status === "sent" &&
            "Listo. Te respondemos dentro de las próximas 24 h hábiles."}
          {status === "mail" && "Te abrimos el mail con el mensaje ya escrito."}
          {status === "limited" && (
            <>
              Recibimos varios mensajes seguidos desde tu conexión. Probá de
              nuevo en un rato o escribinos a{" "}
              <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a>.
            </>
          )}
          {status === "error" && (
            <>
              Ocurrió un error, intentalo más tarde. También podés escribirnos
              a{" "}
              <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a>.
            </>
          )}
        </p>
      </div>
    </form>
  );
}
