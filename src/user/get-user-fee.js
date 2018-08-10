'use strict'
const handleError = require('../handle-error')
const ApiUserFee = require('./api-objects/api-user-fee')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID
  const feeID = event.pathParameters.feeID

  new ApiUserFee().get(userID, feeID)
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
