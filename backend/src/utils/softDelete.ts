/**
 * Soft-delete helpers.
 *
 * Every collection that the admin can delete carries an `isDeleted` flag +
 * `deletedAt` timestamp. A delete never removes the document from MongoDB —
 * it flips the flag — so every read path must explicitly exclude soft-deleted
 * rows with `NOT_DELETED`.
 */

/**
 * Query fragment matching documents that were NOT soft-deleted.
 *
 * Must be `$ne: true` instead of `=== false`: documents created before the
 * feature existed have no `isDeleted` field at all and would otherwise
 * disappear from every list.
 */
export const NOT_DELETED: { isDeleted: { $ne: boolean } } = {
  isDeleted: { $ne: true },
};

/**
 * Fields to `$set` when soft-deleting a document.
 *
 * `isDeleted` is only ever set to `true` (defaults handle `false`) so that
 * legacy documents stay compatible with `NOT_DELETED`.
 */
export const softDeleteFields = (
  extra: Record<string, any> = {}
): { isDeleted: true; deletedAt: Date } & Record<string, any> => ({
  isDeleted: true,
  deletedAt: new Date(),
  ...extra,
});
