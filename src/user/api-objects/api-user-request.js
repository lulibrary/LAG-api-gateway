const Schemas = require('@lulibrary/lag-alma-utils')
const _pick = require('lodash.pick')

const ApiUserObject = require('./api-user-object')

const requestFields = [
  'request_id',
  'user_primary_id',
  'request_type',
  'request_sub_type',
  'request_status',
  'pickup_location',
  'pickup_location_type',
  'pickup_location_library',
  'material_type',
  'comment',
  'place_in_queue',
  'request_date',
  'expiry_date',
  'barcode',
  'mms_id',
  'title',
  'author',
  'description',
  'resource_sharing',
  'process_status'
]

class ApiRequest extends ApiUserObject {
  constructor () {
    super({
      queueUrl: process.env.REQUESTS_QUEUE_URL,
      schema: Schemas.RequestSchema,
      tableName: process.env.REQUEST_CACHE_TABLE_NAME
    })
    this.apiCall = (userID, requestID) => this.almaApi.users.for(userID).getRequest(requestID)
    this.errorMessage = 'No request with matching ID found'
    this.getAllApiCall = (userID) => this.almaApi.users.for(userID).requests()
  }

  get (userID, requestID) {
    return this.getFromCache(requestID)
      .catch(e => this.getFromApi(userID, requestID))
      .then(request => _pick(request, requestFields))
  }
}

module.exports = ApiRequest
