'use strict'

const Schemas = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')
const AlmaClient = require('alma-api-wrapper')

const _pick = require('lodash.pick')
const handleError = require('../handle-error')
const apiError = require('../api-error')

const LoanModel = Schemas.LoanSchema(process.env.LOAN_CACHE_TABLE_NAME)

const loanApiFields = [
  'loan_id',
  'user_id',
  'renewable',
  'call_number',
  'loan_status',
  'due_date',
  'item_barcode',
  'mms_id',
  'title',
  'author',
  'description',
  'publication_year',
  'process_status'
]

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
  return LoanModel.get(loanID)
    .then(user => user
      ? formatCacheLoan(user)
      : (sendToQueue(loanID), Promise.reject())
    )
    .catch(e => getUserFromApi(userID, loanID))
}

const sendToQueue = (message) => {
  return new Queue({ url: process.env.LOANS_QUEUE_URL })
    .sendMessage(message)
}

const formatCacheLoan = loan => _pick(loan, loanApiFields)

const getUserFromApi = (userID, loanID) => {
  return new AlmaClient().users.for(userID).getLoan(loanID)
    .catch(apiError)
    .then(loan => loan.data)
    .then(loanData => _pick(loanData, loanApiFields))
}
