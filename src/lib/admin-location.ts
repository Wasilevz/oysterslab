import { getSupabaseAdmin } from "@/lib/supabase";

export async function getAdminLocationId(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("location_id, role")
    .eq("id", userId)
    .single();

  if (!user) return null;
  if (user.role === "superadmin") return null; // superadmin sees all
  return user.location_id ?? null;
}

export async function getAdminLocationName(userId: string): Promise<string | null> {
  const locationId = await getAdminLocationId(userId);
  if (!locationId) return null;

  const supabase = getSupabaseAdmin();
  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("id", locationId)
    .single();

  return location?.name ?? null;
}
