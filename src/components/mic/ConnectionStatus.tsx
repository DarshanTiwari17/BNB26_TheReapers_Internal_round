export default function ConnectionStatus({ sessionName }: { sessionName: string }) {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-2 text-[13px] text-[#666]">
      <span className="relative flex h-[8px] w-[8px]" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#18A874] opacity-60" />
        <span className="relative inline-flex h-[8px] w-[8px] rounded-full bg-[#18A874]" />
      </span>
      <span>
        Connected to: <span className="font-semibold text-[#111111]">{sessionName}</span>
      </span>
    </p>
  );
}
