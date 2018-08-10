'use strict'
const handleError = require('../handle-error')
const ApiUserRequest = require('./api-objects/api-user-request')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID
  const requestID = event.pathParameters.requestID

  new ApiUserRequest()
    .get(userID, requestID)
    .then(response => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(response)
      })
    })
    .catch(e => {
      console.log(e)
      callback(handleError(e))
    })
}
