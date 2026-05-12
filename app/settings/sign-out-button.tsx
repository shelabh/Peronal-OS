"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setSubmitting(true);

    try {
      await authClient.signOut();
      router.replace("/auth/sign-in");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleSignOut} disabled={submitting}>
      <LogOut className="h-4 w-4" />
      {submitting ? "Signing out..." : "Sign out"}
    </Button>
  );
}
