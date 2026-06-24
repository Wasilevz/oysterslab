import { getSupabaseAdmin } from "@/lib/supabase";

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null = null,
  details: string | null = null,
  ipAddress: string | null = null,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("audit_log").insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
    });
  } catch {
    // Silent fail - don't break the app if logging fails
  }
}

export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0,
): Promise<AuditLog[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("audit_log")
      .select("*, users!inner(full_name)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    return (data ?? []) as AuditLog[];
  } catch {
    return [];
  }
}
