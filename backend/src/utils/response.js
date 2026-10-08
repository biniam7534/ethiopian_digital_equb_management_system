/**
 * Consistent JSON API response helpers.
 */
function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function created(res, data = null, message = 'Created') {
  return success(res, data, message, 201);
}

function fail(res, message = 'Request failed', statusCode = 400, code = 'BAD_REQUEST', details = null) {
  const body = {
    success: false,
    message,
    code,
  };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = {
  success,
  created,
  fail,
};
