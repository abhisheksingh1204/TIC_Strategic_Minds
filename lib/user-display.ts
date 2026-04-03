type MaybeUser = {
  name?: string | null;
  email?: string | null;
};

export function getUserDisplayName(user?: MaybeUser): string {
  const explicitName = user?.name?.trim();
  if (explicitName) return explicitName;

  const email = user?.email?.trim();
  if (!email) return "User";

  const localPart = email.split("@")[0]?.trim();
  return localPart || "User";
}
