import { requireContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ArtistForm } from "./artist-form";

export const metadata = { title: "Community" };

export default async function CommunityProfilePage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("artist_profiles")
    .select("*")
    .eq("organization_id", ctx.activeOrgId ?? "")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-heading text-2xl font-semibold tracking-tight">Artist profile</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Introduce yourself to the community. Public profiles appear on the org&apos;s community page.
      </p>
      <Card className="py-6">
        <CardContent>
          <ArtistForm
            defaults={
              profile
                ? {
                    stage_name: profile.stage_name,
                    discipline: profile.discipline ?? undefined,
                    bio: profile.bio ?? undefined,
                    links: profile.links ?? undefined,
                    is_public: profile.is_public,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
