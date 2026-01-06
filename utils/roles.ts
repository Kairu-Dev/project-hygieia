import { Roles } from "@/types/globals";
import { auth } from "@clerk/nextjs/server";

export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth();

  // Default to "patient" if role is missing (aligns with getRole behavior)
  // This fixes the race condition where new users don't see patient UI immediately
  const userRole = sessionClaims?.metadata?.role || "patient";

  return userRole === role.toLowerCase();
};

export const getRole = async () => {
  const { sessionClaims } = await auth();

  const role = sessionClaims?.metadata.role!?.toLowerCase() || "patient";

  return role;
};