const Schemas = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')

const ApiObject = require('./api-object')

const _pick = require('lodash.pick')
const apiError = require('../../api-error')

const loanFields = [
  'loan_id',
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
    super()
    this.Model = Schemas.LoanSchema(process.env.LOAN_CACHE_TABLE_NAME)
    this.queue = new Queue({ url: process.env.LOANS_QUEUE_URL })
  }

  get (userID, loanID) {
    return this.getFromCache(loanID)
      .catch(() => this.getFromApi(userID, loanID))
  }

  getFromApi (userID, loanID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(userID).getLoan(loanID))
      .catch(apiError)
      .then(loan => _pick(loan.data, loanFields))
  }

  getFromCache (loanID) {
    return this.Model.get(loanID)
      .then(loan => loan || (this.queue.sendMessage(loanID), Promise.reject()))
  }
}

module.exports = ApiLoan
