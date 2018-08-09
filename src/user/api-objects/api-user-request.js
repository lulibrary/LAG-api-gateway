const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

class ApiRequest extends ApiObject {
  constructor () {
    super({
      queueUrl: process.env.REQUESTS_QUEUE_URL,
      schema: Schemas.RequestSchema,
      tableName: process.env.REQUEST_CACHE_TABLE_NAME
    })
    this.apiCall = (userID, requestID) => this.almaApi.users.for(userID).getRequest(requestID)
    this.errorMessage = 'No request with matching ID found'
  }

  get (userID, requestID) {
    return this.getFromCache(requestID)
      .catch(() => this.getFromApi(userID, requestID))
  }

  getAllFromApi (userID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(userID).requests())
      .catch(e => {
        throw new HttpError(400, 'No user with matching ID found')
      })
  }
}

module.exports = ApiRequest
