const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

const _pick = require('lodash.pick')

const ApiUserLoan = require('./api-user-loan')
const ApiUserRequest = require('./api-user-request')
const ApiUserFee = require('./api-user-fee')

const userApiFields = [
  'primary_id',
  'loans',
  'requests',
  'fees'
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
    const subResources = [
      { name: 'loans', resolver: new ApiUserLoan() },
      { name: 'requests', resolver: new ApiUserRequest() },
      { name: 'fees', resolver: new ApiUserFee() }
    ]

    return this.getFromCache(userID)
      .then(formatCacheUser)
      .catch(() => {
        this.queue.sendMessage(userID)
        return Promise.all(
          subResources.map(resource =>
            this._getResourceIDsFromApi(userID, resource.resolver)
          ))
          .then(IDs => formatUserResources(userID, IDs))
      })
      .then(user => Promise.all(
        subResources.map(resource =>
          this._resolveResources(userID, user[resource.name], resource.resolver)
        )))
      .then(data => formatUserResources(userID, data))
  }

  getLoans (userID) {
    return this._getResources(userID, ApiUserLoan, 'loan_ids')
  }

  getRequests (userID) {
    return this._getResources(userID, ApiUserRequest, 'request_ids')
  }

  getFees (userID) {
    return this._getResources(userID, ApiUserFee, 'fee_ids')
  }

  _getResources (userID, ResolverClass, cacheIDsField) {
    const resolver = new ResolverClass()
    return this._getResourceIDs(userID, cacheIDsField, resolver)
      .then(IDs => this._resolveResources(userID, IDs, resolver))
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
    requests: user.request_ids,
    fees: user.fee_ids
  }
}

const formatUserResources = (userID, responses) => {
  return {
    primary_id: userID,
    loans: responses[0],
    requests: responses[1],
    fees: responses[2]
  }
}

const apiError = e => {
  throw new HttpError(400, 'No user with matching ID found')
}

module.exports = ApiUser
