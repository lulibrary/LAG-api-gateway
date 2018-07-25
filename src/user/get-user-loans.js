'use strict'

const { Queue } = require('@lulibrary/lag-utils')

const handleError = require('../handle-error')

// const LoanModel = Schemas.LoanSchema(process.env.LOAN_CACHE_TABLE_NAME)

const resolveUserLoan = require('./loans/resolve-user-loan')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID
  const loanID = event.pathParameters.loanID

  handleUserLoan(userID, loanID)
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

const handleUserLoan = (userID, loanID) => {
  return UserModel.get(userID)
    .then(user => {
      Promise.all(user.loan_ids.map(loanID => resolveUserLoan(userID, loanID)))
    })
}

const resolveUser = (userID)

const sendToQueue = (message) => {
  return new Queue({ url: process.env.USERS_QUEUE_URL })
    .sendMessage(message)
}
