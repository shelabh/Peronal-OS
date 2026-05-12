import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Database, Smartphone, Info, Shield } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/server";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getCurrentSession();

  return (
    <div>
      <PageHeader title="Settings" description="App configuration" />
      <div className="px-4 space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Account
            </CardTitle>
            <CardDescription>
              Signed in with Neon Auth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {session?.user?.email ?? session?.user?.name ?? "Signed-in user"}
            </p>
            <SignOutButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Database
            </CardTitle>
            <CardDescription>
              Connect your Neon Postgres database by setting the <code className="text-xs bg-muted px-1 rounded">DATABASE_URL</code> and <code className="text-xs bg-muted px-1 rounded">DIRECT_URL</code> environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Use the pooled Neon connection for <code className="bg-muted px-1 rounded">DATABASE_URL</code> and the direct connection for Prisma migrations.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Install App
            </CardTitle>
            <CardDescription>
              This is a Progressive Web App. Add it to your home screen for the best experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              On iOS: tap Share → &quot;Add to Home Screen&quot;.<br />
              On Android: tap the browser menu → &quot;Install app&quot;.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" /> About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Personal OS — MVP v0.1.0</p>
              <p>Stack: Next.js · TypeScript · TailwindCSS · Prisma · Neon Postgres · Neon Auth</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
