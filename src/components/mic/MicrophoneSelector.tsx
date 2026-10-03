import { useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "../../lib/utils";
import { friendlyMicLabel } from "../../lib/audio";

export default function MicrophoneSelector({
  devices,
  selectedId,
  onSelect,
  disabled,
}: {
  devices: MediaDeviceInfo[];
  selectedId: string | null;
  onSelect: (deviceId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (devices.length <= 1) {
    const only = devices[0];
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F7F5] px-4 py-3.5">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-[#E4E4E0]">
            <Mic className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold">{only ? friendlyMicLabel(only, 0, 1) : "Phone Microphone"}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAE8FF] px-3 py-1.5 text-[12px] font-semibold text-[#635BFF]">
          <span className="h-[6px] w-[6px] rounded-full bg-[#635BFF]" /> Selected
        </span>
      </div>
    );
  }

  const selected = devices.find((d) => d.deviceId === selectedId) ?? devices[0];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl bg-[#F7F7F5] px-4 py-3.5 text-left transition hover:ring-1 hover:ring-[#635BFF] disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-[#E4E4E0]">
            <Mic className="h-4 w-4" />
          </span>
          <span className="truncate text-[15px] font-semibold">{friendlyMicLabel(selected, 0, devices.length)}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-[#8A8A86]">{open ? "Close" : "Change"}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label="Microphones" className="mt-2 space-y-2">
          {devices.map((device, i) => {
            const active = device.deviceId === (selectedId ?? devices[0]?.deviceId);
            return (
              <li key={device.deviceId || i}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => {
                    onSelect(device.deviceId);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    active ? "border-[#635BFF] bg-[#EAE8FF]/40" : "border-[#E4E4E0] bg-white hover:border-[#111111]"
                  )}
                >
                  <span className="truncate text-[14px] font-medium">{friendlyMicLabel(device, i, devices.length)}</span>
                  {active && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-[#635BFF]">
                      <span className="h-[6px] w-[6px] rounded-full bg-[#635BFF]" /> Selected
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
