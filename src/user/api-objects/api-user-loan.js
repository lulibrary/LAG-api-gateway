const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

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

class ApiLoan extends ApiObject {
  constructor () {
    super({
      queueUrl: process.env.LOANS_QUEUE_URL,
      schema: Schemas.LoanSchema,
      tableName: process.env.LOAN_CACHE_TABLE_NAME
    })
  }

  get (userID, loanID) {
    return this.getFromCache(userID, loanID)
      .catch(() => this.getFromApi(userID, loanID))
      .then(loan => _pick(loan, loanFields))
  }

  getFromApi (userID, loanID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(userID).getLoan(loanID))
      .catch(e => {
        throw new HttpError(400, 'No loan with matching ID found')
      })
      .then(loan => loan.data)
  }

  getFromCache (userID, loanID) {
    return this.Model.get(loanID)
      .then(loan => loan || (this.queue.sendMessage(JSON.stringify({
        userID,
        loanID
      })), Promise.reject()))
  }
}

module.exports = ApiLoan
