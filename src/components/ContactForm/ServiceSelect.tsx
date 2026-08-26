import { useEffect, useId, useRef, useState } from "react";

interface ServiceSelectProps {
  name: string;
  /** id of the row's <label>, since a button takes no `for`. */
  labelId: string;
  placeholder: string;
  options: string[];
}

/**
 * A listbox that replaces the native <select>.
 *
 * The native control's popup is drawn by the operating system: the row
 * height, the padding and that blue highlight all ignore CSS, so the one
 * field on the page that could not be made to match the site was this
 * one. Everything here is real DOM, so it takes the same tokens as the
 * rows around it.
 *
 * The value still leaves through a hidden input, so FormData keeps
 * working and nothing upstream in the form has to know the difference.
 */
export function ServiceSelect({
  name,
  labelId,
  placeholder,
  options,
}: ServiceSelectProps) {
  const id = useId();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  // Which option the keyboard is on; -1 while nothing is highlighted.
  const [active, setActive] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const optionId = (index: number) => `${id}-option-${index}`;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option in view when arrowing past the edge.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
  });

  function choose(index: number) {
    setValue(options[index]);
    setOpen(false);
    setActive(index);
    buttonRef.current?.focus();
  }

  function openList() {
    setOpen(true);
    setActive(value ? options.indexOf(value) : 0);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          openList();
          return;
        }
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((current) => {
          const next = current + step;
          if (next < 0) return options.length - 1;
          if (next >= options.length) return 0;
          return next;
        });
        return;
      }
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        return;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(options.length - 1);
        }
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open && active >= 0) choose(active);
        else openList();
        return;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
        }
        return;
      case "Tab":
        // Leaving the field closes it; the browser handles the move.
        setOpen(false);
    }
  }

  return (
    <div className="service-select" ref={wrapperRef}>
      {/* Carries the value into FormData exactly as the <select> did. */}
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        className="service-select__button"
        ref={buttonRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        aria-labelledby={labelId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        data-placeholder={value ? undefined : true}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{value || placeholder}</span>
        <span className="service-select__chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul
          className="service-select__list"
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={optionId(index)}
              className="service-select__option"
              role="option"
              aria-selected={option === value}
              data-active={index === active ? true : undefined}
              // pointerdown, not click: the outside-click listener runs
              // on pointerdown too, and would close the list first.
              onPointerDown={(event) => {
                event.preventDefault();
                choose(index);
              }}
              onPointerEnter={() => setActive(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
