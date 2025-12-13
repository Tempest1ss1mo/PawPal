const crypto = require('crypto');

/**
 * Generate ETag from data
 * @param {any} data - Data to generate ETag from
 * @returns {string} ETag value
 */
function generateETag(data) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = crypto.createHash('md5').update(dataString).digest('hex');
  return `"${hash}"`;
}

/**
 * Check if ETag matches (weak comparison)
 * @param {string} etag - ETag from request
 * @param {string} currentETag - Current ETag of resource
 * @returns {boolean} True if ETags match
 */
function etagMatches(etag, currentETag) {
  if (!etag || !currentETag) return false;
  
  // Remove quotes and 'W/' prefix for weak comparison
  const normalize = (tag) => tag.replace(/^W\//, '').replace(/"/g, '');
  
  return normalize(etag) === normalize(currentETag);
}

/**
 * Middleware to check If-None-Match header
 * Returns 304 Not Modified if ETag matches
 */
function checkETag(req, res, next) {
  const ifNoneMatch = req.headers['if-none-match'];
  
  if (ifNoneMatch) {
    res.locals.ifNoneMatch = ifNoneMatch;
  }
  
  next();
}

/**
 * Middleware to check If-Match header for conditional updates
 * Returns 412 Precondition Failed if ETag doesn't match
 */
function requireETagMatch(req, res, next) {
  const ifMatch = req.headers['if-match'];
  
  if (ifMatch) {
    res.locals.ifMatch = ifMatch;
  }
  
  next();
}

module.exports = {
  generateETag,
  etagMatches,
  checkETag,
  requireETagMatch
};

