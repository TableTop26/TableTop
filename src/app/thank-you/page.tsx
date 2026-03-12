export default function ThankYouPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <span className="text-4xl">✓</span>
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900">
        Thanks for dining with us!
      </h1>
      <p className="text-zinc-500">
        Your session has ended. We hope to see you again soon.
      </p>
    </main>
  );
}
