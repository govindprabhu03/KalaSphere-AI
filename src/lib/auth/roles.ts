/**
 * Role model for the platform.
 *
 * - Org roles live on `organization_members.role` and scope a user to ONE
 *   Ravindra Bhavan (organization).
 * - `super_admin` is platform-wide (stored as `profiles.is_platform_admin`),
 *   not an org membership.
 * - `public` means "signed in but not a member of the active org" (or a
 *   visitor). It carries no org privileges.
 */

export const ORG_ROLES = [
  "admin",
  "faculty",
  "parent",
  "student",
  "artist",
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const APP_ROLES = ["super_admin", ...ORG_ROLES, "public"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Human-readable labels for UI. */
export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  faculty: "Faculty",
  parent: "Parent",
  student: "Student",
  artist: "Artist",
  public: "Public",
};

export function isOrgRole(value: string): value is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(value);
}
