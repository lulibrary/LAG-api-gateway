'use strict'

const { Queue } = require('@lulibrary/lag-utils')

const handleError = require('../handle-error')

// const LoanModel = Schemas.LoanSchema(process.env.LOAN_CACHE_TABLE_NAME)

// const resolveUserLoan = require('./loans/resolve-user-loan')

const ApiUser = require('./api-objects/api-user')
const ApiUserLoan = require('./api-objects/api-user-loan')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID

  handleUserLoans(userID)
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

const handleUserLoans = (userID) => {
  const loanResolver = new ApiUserLoan()

  return new ApiUser()
    .getLoanIDs(userID)
    .then(loans => {
      return Promise.all(loans.map(loan => loanResolver.get(loan)))
    })
}
