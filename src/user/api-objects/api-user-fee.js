const Schemas = require('@lulibrary/lag-alma-utils')
const _pick = require('lodash.pick')

const ApiUserObject = require('./api-user-object')

const feeFields = [
  'id',
  'user_primary_id',
  'type',
  'status',
  'balance',
  'remaining_vat_amount',
  'original_amount',
  'original_vat_amount',
  'creation_time',
  'comment',
  'owner',
  'title',
  'barcode',
  'bursar_transaction_id',
  'transactions'
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
