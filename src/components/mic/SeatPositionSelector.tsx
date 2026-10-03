import { cn } from "../../lib/utils";

export const SEAT_POSITIONS = [
  { id: "top", label: "Top", x: 50, y: 4 },
  { id: "top-right", label: "Top right", x: 80, y: 16 },
  { id: "right", label: "Right", x: 92, y: 50 },
  { id: "bottom-right", label: "Bottom right", x: 80, y: 84 },
  { id: "bottom", label: "Bottom", x: 50, y: 96 },
  { id: "bottom-left", label: "Bottom left", x: 20, y: 84 },
  { id: "left", label: "Left", x: 8, y: 50 },
  { id: "top-left", label: "Top left", x: 20, y: 16 },
] as const;

export type SeatId = (typeof SEAT_POSITIONS)[number]["id"];

export default function SeatPositionSelector({
  selected,
  onSelect,
  onSkip,
}: {
  selected: SeatId | null;
  onSelect: (seat: SeatId) => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <div
        className="relative mx-auto aspect-square w-full max-w-[280px]"
        role="group"
        aria-label="Approximate seating position"
      >
        {/* table */}
        <div className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#E4E4E0] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.06)]" />
        {SEAT_POSITIONS.map((seat) => {
          const active = selected === seat.id;
          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSelect(seat.id)}
              aria-pressed={active}
              aria-label={`Sit at ${seat.label}${active ? " (selected)" : ""}`}
              className={cn(
                "absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[11px] font-bold transition-all",
                active
                  ? "border-[#635BFF] bg-[#635BFF] text-white shadow-[0_8px_24px_rgba(99,91,255,0.35)]"
                  : "border-[#E4E4E0] bg-white text-[#666] hover:border-[#111111] hover:text-[#111111]"
              )}
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            >
              {active ? "YOU" : "○"}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[13px] text-[#666]" role="status">
        {selected
          ? `You're sitting at the ${SEAT_POSITIONS.find((s) => s.id === selected)?.label.toLowerCase() ?? ""} of the table.`
          : "Tap a seat, or skip — this is optional."}
      </p>
      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="min-h-[44px] rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#666] underline-offset-4 transition hover:text-[#111111] hover:underline"
        >
          Skip for now
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-[420px] text-center text-[12px] leading-relaxed text-[#8A8A86]">
        Roundtable can use microphone position as one signal when deciding who is speaking.
      </p>
    </div>
  );
}
