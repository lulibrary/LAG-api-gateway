const HTTPError = require('node-http-error')

const apiError = e => {
  if (e.response) {
    throw new HTTPError(400, `No item with matching ID found`)
  } else {
    throw new HTTPError(500, 'Unable to reach Alma')
  }
}

module.exports = apiError
