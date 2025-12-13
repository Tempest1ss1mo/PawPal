/**
 * Generate HATEOAS links for resources
 * @param {Object} options - Link generation options
 * @param {string} options.baseUrl - Base URL for the API
 * @param {string} options.path - Resource path
 * @param {number} options.id - Resource ID (optional)
 * @param {Object} options.query - Query parameters (optional)
 * @param {number} options.page - Current page number (optional)
 * @param {number} options.limit - Items per page (optional)
 * @param {number} options.total - Total number of items (optional)
 * @returns {Object} Links object
 */
function generateLinks(options = {}) {
  const { baseUrl, path, id, query = {}, page, limit, total } = options;
  
  const links = {
    self: {
      href: buildUrl(baseUrl, path, id, query)
    }
  };
  
  // Add collection link
  if (id) {
    links.collection = {
      href: buildUrl(baseUrl, path, null, query)
    };
  }
  
  // Add pagination links
  if (page !== undefined && limit !== undefined && total !== undefined) {
    const totalPages = Math.ceil(total / limit);
    
    if (page > 1) {
      links.first = {
        href: buildUrl(baseUrl, path, null, { ...query, page: 1, limit })
      };
      links.prev = {
        href: buildUrl(baseUrl, path, null, { ...query, page: page - 1, limit })
      };
    }
    
    if (page < totalPages) {
      links.next = {
        href: buildUrl(baseUrl, path, null, { ...query, page: page + 1, limit })
      };
      links.last = {
        href: buildUrl(baseUrl, path, null, { ...query, page: totalPages, limit })
      };
    }
  }
  
  return links;
}

/**
 * Build URL from components
 * @param {string} baseUrl - Base URL
 * @param {string} path - Resource path
 * @param {number|null} id - Resource ID
 * @param {Object} query - Query parameters
 * @returns {string} Complete URL
 */
function buildUrl(baseUrl, path, id = null, query = {}) {
  let url = `${baseUrl}${path}`;
  
  if (id) {
    url += `/${id}`;
  }
  
  const queryString = Object.entries(query)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return url;
}

/**
 * Get base URL from request
 * @param {Object} req - Express request object
 * @returns {string} Base URL
 */
function getBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

module.exports = {
  generateLinks,
  buildUrl,
  getBaseUrl
};

