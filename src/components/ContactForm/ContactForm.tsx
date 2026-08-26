import { useId, useRef, useState, type FormEvent } from "react";
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

/** idle → sending → sent | error, plus `mail` for the no-endpoint path. */
type Status = "idle" | "sending" | "sent" | "error" | "mail";

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
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
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
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Enviando…" : "Enviar mensaje"}
        </Button>

        {/* Polite, so the result is announced without cutting off
            whatever the screen reader is already saying. */}
        <p className="contact-form__status" role="status" aria-live="polite">
          {status === "sent" &&
            "Listo. Te respondemos dentro de las próximas 24 h hábiles."}
          {status === "mail" && "Te abrimos el mail con el mensaje ya escrito."}
          {status === "error" && (
            <>
              No pudimos enviarlo. Escribinos a{" "}
              <a href={`mailto:${data.contact.email}`}>{data.contact.email}</a>.
            </>
          )}
        </p>
      </div>
    </form>
  );
}
