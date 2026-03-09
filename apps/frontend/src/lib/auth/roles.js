export const ROLE_ORDER = ["helper", "srhelper", "mod", "srmod", "admin", "owner"];

export function hasMinRole(currentRole, minRole) {
  if (!minRole) return true;
  const currentIndex = ROLE_ORDER.indexOf(String(currentRole || "").toLowerCase());
  const minIndex = ROLE_ORDER.indexOf(String(minRole || "").toLowerCase());
  if (minIndex === -1) return false;
  return currentIndex >= minIndex;
}
