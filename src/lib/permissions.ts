export function isOwner(
  entity: { created_by: string | null } | null | undefined,
  userId: string | null
): boolean {
  return !!userId && !!entity?.created_by && entity.created_by === userId;
}
