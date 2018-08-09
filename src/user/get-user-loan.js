'use strict'
const handleError = require('../handle-error')
const ApiUserLoan = require('./api-objects/api-user-loan')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID
  const loanID = event.pathParameters.loanID

  new ApiUserLoan().get(userID, loanID)
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
