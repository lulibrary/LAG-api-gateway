'use strict'

const handleError = require('../handle-error')
const ApiUser = require('./api-objects/api-user')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID

  new ApiUser()
    .getRequests(userID)
    .then(response => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(response)
      })
    })
    .catch(e => {
      callback(handleError(e))
    })
}
