interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  emptyLabel?: string;
}

export function MultiChipSelect({ options, value, onChange, disabled, emptyLabel }: Props) {
  if (disabled) {
    return (
      <div className="text-xs text-muted-foreground italic bg-surface border border-dashed border-border rounded-lg px-3 py-3">
        {emptyLabel ?? "Selecciona el paso anterior para habilitar."}
      </div>
    );
  }

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {active && <span className="mr-1">✓</span>}
            {opt}
          </button>
        );
      })}
      {options.length === 0 && (
        <div className="text-xs text-muted-foreground italic">Sin opciones disponibles.</div>
      )}
    </div>
  );
}
