const MESSAGE = "This marketplace isn't connected to its database yet.";

export function NotConfigured() {
  return (
    <div role="status" className="rounded-2xl border border-line bg-surface p-5">
      <p className="font-semibold">{MESSAGE}</p>
      <p className="mt-1 text-sm text-ink-soft">Add the Supabase values described in the README, then reload the page.</p>
    </div>
  );
}
