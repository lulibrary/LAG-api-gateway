const Schemas = require('@lulibrary/lag-alma-utils')

const ApiUserObject = require('./api-user-object')

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
      .catch(() => this.getFromApi(userID, requestID))
  }
}

module.exports = ApiRequest
