const HTTPError = require('node-http-error')

const handleError = (error) => {
  if (!(error instanceof HTTPError)) {
    console.log(error)
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
