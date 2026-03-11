/**
 * Returns the wedding owner's user ID for query scoping.
 * - Admin users own their own data (id = req.user.id)
 * - Family/Friends users share the admin's data (id = req.user.created_by)
 */
function getWeddingOwnerId(req) {
  return req.user.role === 'admin' ? req.user.id : req.user.created_by;
}

module.exports = { getWeddingOwnerId };
