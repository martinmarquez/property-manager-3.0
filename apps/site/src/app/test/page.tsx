export default function TestPage() {
  return (
    <main className="flex items-center justify-center min-h-dvh bg-surface-base">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-ink mb-4">Test Page</h1>
        <p className="text-ink-muted mb-8">If you can see this, basic page rendering is working.</p>
        <a href="/" className="text-accent hover:text-accent-hover">Back to home</a>
      </div>
    </main>
  );
}
