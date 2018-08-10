const Schemas = require('@lulibrary/lag-alma-utils')
const _pick = require('lodash.pick')

const ApiUserObject = require('./api-user-object')

const feeFields = [
  'fee_id',
  'renewable',
  'call_number',
  'fee_status',
  'due_date',
  'item_barcode',
  'mms_id',
  'title',
  'author',
  'description',
  'publication_year',
  'process_status'
]

class ApiFee extends ApiUserObject {
  constructor () {
    super({
      queueUrl: process.env.FEES_QUEUE_URL,
      schema: Schemas.FeeSchema,
      tableName: process.env.FEE_CACHE_TABLE_NAME
    })
    this.apiCall = (userID, feeID) => this.almaApi.users.for(userID).getFee(feeID)
    this.errorMessage = 'No fee with matching ID found'
    this.getAllApiCall = (userID) => this.almaApi.users.for(userID).fees()
  }

  get (userID, feeID) {
    return this.getFromCache(feeID)
      .catch(() => this.getFromApi(userID, feeID))
      .then(fee => _pick(fee, feeFields))
  }
}

module.exports = ApiFee
