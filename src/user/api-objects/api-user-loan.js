const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiUserObject = require('./api-user-object')

const _pick = require('lodash.pick')

const loanFields = [
  'loan_id',
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

class ApiLoan extends ApiUserObject {
  constructor () {
    super({
      queueUrl: process.env.LOANS_QUEUE_URL,
      schema: Schemas.LoanSchema,
      tableName: process.env.LOAN_CACHE_TABLE_NAME
    })
    this.apiCall = (userID, loanID) => this.almaApi.users.for(userID).getLoan(loanID)
    this.errorMessage = 'No loan with matching ID found'
    this.getAllApiCall = (userID) => this.almaApi.users.for(userID).loans()
  }

  get (userID, loanID) {
    return this.getFromCache(loanID)
      .catch(() => this.getFromApi(userID, loanID))
      .then(loan => _pick(loan, loanFields))
  }
}

module.exports = ApiLoan
