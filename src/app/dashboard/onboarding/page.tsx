import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // ownerId is uniquely the Auth0 user's internal tracking sub indicator
  const ownerId = session.user.sub;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <OnboardingForm ownerId={ownerId} />
    </div>
  );
}
