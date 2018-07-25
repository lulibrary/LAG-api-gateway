const HTTPError = require('node-http-error')

const handleError = (error) => {
  console.log(error)
  if (!(error instanceof HTTPError)) {
    error = new HTTPError(500, 'Internal Server Error')
  }

  return {
    statusCode: error.status,
    body: JSON.stringify({
      message: error.message
    })
  }
}

module.exports = handleError
