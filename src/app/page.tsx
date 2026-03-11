import { auth0 } from "@/lib/auth0";

export default async function Home() {
  // Check if user is authenticated
  const session = await auth0.getSession();

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black p-24">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-black dark:text-white">Welcome to Tabletop</h1>
        <div className="flex gap-4">
          <a className="rounded-full border border-black px-6 py-3 font-medium text-black transition-colors hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10" href="/auth/login?screen_hint=signup">Sign up</a>
          <a className="rounded-full bg-black px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200" href="/auth/login">Login</a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black p-24">
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-black dark:text-white">Welcome back!</h1>
      <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">Logged in as {session.user.name || session.user.email}</p>

      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 mb-8">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">User Profile</h2>
        </div>
        <div className="p-6">
          <pre className="overflow-x-auto text-sm text-zinc-600 dark:text-zinc-400">
            {JSON.stringify(session.user, null, 2)}
          </pre>
        </div>
      </div>

      <a className="rounded-full bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700" href="/auth/logout">Logout</a>
    </main>
  );
}
