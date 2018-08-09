const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

const _pick = require('lodash.pick')

const ApiUserLoan = require('./api-user-loan')
const ApiUserRequest = require('./api-user-request')

const userApiFields = [
  'primary_id',
  'loans',
  'requests'
]

class ApiUser extends ApiObject {
  constructor () {
    super({
      queueUrl: process.env.USERS_QUEUE_URL,
      schema: Schemas.UserSchema,
      tableName: process.env.USER_CACHE_TABLE_NAME
    })
    this.apiCall = (userID) => this.almaApi.users.get(userID)
    this.errorMessage = 'No user with matching ID found'
  }

  get (userID) {
    return this.getFromCache(userID)
      .then(formatCacheUser)
      .catch(() => {
        this.queue.sendMessage(userID)
        return this.getFromApi(userID)
          .then(user => _pick(user, userApiFields))
      })
  }

  getLoans (userID) {
    const loanResolver = new ApiUserLoan()
    return this.getLoanIDs(userID)
      .then(loanIDs => this._resolveResources(userID, loanIDs, loanResolver)
      )
  }

  getLoanIDs (userID) {
    const loanResolver = new ApiUserLoan()
    return this._getResourceIDs(userID, 'loan_ids', loanResolver)
  }

  getRequests (userID) {
    const requestResolver = new ApiUserRequest()
    return this.getRequestIDs(userID)
      .then(requestIDs => this._resolveResources(userID, requestIDs, requestResolver))
  }

  getRequestIDs (userID) {
    const requestResolver = new ApiUserRequest()
    return this._getResourceIDs(userID, 'request_ids', requestResolver)
  }

  _getResourceIDs (userID, resourceName, resolver) {
    return this.getFromCache(userID)
      .then(user => user[resourceName])
      .catch(() => {
        this.queue.sendMessage(userID)
        return this._getResourceIDsFromApi(userID, resolver)
      })
  }

  _getResourceIDsFromApi (userID, resolver) {
    return resolver.getAllFromApi(userID)
      .then(resources => Array.from(resources.keys()))
  }

  _resolveResources (userID, resourceIDs, resolver) {
    return Promise.all(
      resourceIDs.map(resourceID => resolver
        .get(userID, resourceID)
        .catch(e => null)
      )
    )
      .then(resources => resources.filter(resource => resource))
  }
}

const formatCacheUser = user => {
  return {
    primary_id: user.primary_id,
    loans: user.loan_ids,
    requests: user.request_ids
  }
}

const apiError = e => {
  throw new HttpError(400, 'No user with matching ID found')
}

module.exports = ApiUser
