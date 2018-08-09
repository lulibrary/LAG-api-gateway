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
  }

  get (userID, requestID) {
    return this.getFromCache(userID, requestID)
      .catch(() => this.getFromApi(userID, requestID))
  }

  getFromApi (userID, requestID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(userID).getRequest(requestID))
      .catch(e => {
        throw new HttpError(400, 'No request with matching ID found')
      })
      .then(request => request.data)
  }

  getFromCache (userID, requestID) {
    return this.Model.get(requestID)
      .then(request => request || (this.queue.sendMessage(JSON.stringify({
        userID,
        requestID
      })), Promise.reject()))
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
