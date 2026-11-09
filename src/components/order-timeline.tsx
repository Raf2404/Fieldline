import { ORDER_FLOW, ORDER_STATUS, type OrderStatusCode } from "@/lib/orders";

/** Frise des étapes : étapes passées cochées avec leur date, étape actuelle en surbrillance. */
export function OrderTimeline({ status, dates }: { status: OrderStatusCode; dates: Partial<Record<OrderStatusCode, Date>> }) {
  const current = ORDER_FLOW.indexOf(status);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
  return (
    <ol className="relative space-y-0">
      {ORDER_FLOW.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done ? "bg-brand text-white" : active ? "bg-accent text-ink ring-4 ring-accent/30" : "bg-black/5 text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < ORDER_FLOW.length - 1 && <span className={`w-0.5 flex-1 ${done ? "bg-brand" : "bg-black/10"}`} />}
            </div>
            <div className="pb-5 pt-0.5">
              <p className={`text-sm ${active ? "font-bold" : done ? "font-medium" : "text-muted"}`}>{ORDER_STATUS[s].label}</p>
              {dates[s] && (done || active) && <p className="text-xs text-muted">{fmt.format(dates[s])}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
