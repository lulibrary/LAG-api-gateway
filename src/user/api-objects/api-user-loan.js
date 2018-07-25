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
  constructor (userID, loanID) {
    super()
    this.userID = userID
    this.loanID = loanID
    this.Model = Schemas.LoanSchema(process.env.LOAN_CACHE_TABLE_NAME)
    this.queue = new Queue({ url: process.env.LOANS_QUEUE_URL })
  }

  get () {
    return this.getFromCache()
      .catch(() => this.getFromApi())
  }

  getFromApi () {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(this.userID).getLoan(this.loanID))
      .catch(apiError)
      .then(loan => _pick(loan.data, loanFields))
  }

  getFromCache () {
    return this.Model.get(this.loanID)
      .then(loan => loan || (this.queue.sendMessage(this.loanID), Promise.reject())
      )
  }
}

module.exports = ApiLoan
