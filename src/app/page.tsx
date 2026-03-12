import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await auth0.getSession();

  // Authenticated users go straight to the dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // Marketing / login landing page
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-5xl font-black tracking-tight">TableTop</h1>
        <p className="text-lg text-muted-foreground">
          The restaurant operating system for seamless group dining.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/auth/login?screen_hint=signup&returnTo=/dashboard"
          className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Sign up
        </Link>
        <Link
          href="/auth/login?returnTo=/dashboard"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
