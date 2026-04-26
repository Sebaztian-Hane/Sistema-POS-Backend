const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * @param {Record<string, string | undefined>} query - req.query
 * @returns {{ page: number; limit: number; skip: number }}
 */
function parsePagination(query = {}) {
  const rawPage = parseInt(String(query.page ?? ""), 10);
  const rawLimit = parseInt(String(query.limit ?? ""), 10);

  const page =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  let limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Metadatos para respuestas JSON paginadas.
 * @param {number} total - Total de registros
 * @param {number} page
 * @param {number} limit
 */
function buildPaginationMeta(total, page, limit) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
