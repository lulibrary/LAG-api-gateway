const Schemas = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')

const ApiObject = require('./api-object')

const _pick = require('lodash.pick')
const apiError = require('../../api-error')

const userApiFields = [
  'primary_id',
  'loans',
  'requests'
]

class ApiUser extends ApiObject {
  constructor () {
    super()
    this.Model = Schemas.UserSchema(process.env.USER_CACHE_TABLE_NAME)
    this.queue = new Queue({ url: process.env.USERS_QUEUE_URL })
  }

  get (userID) {
    return this.getFromCache(userID)
      .catch(() => this.getFromApi(userID))
  }

  getLoanIDs (userID) {
    return this.getFromCache(userID)
      .catch(() => this.getLoansFromApi(userID))
      .then(user => user.loans)
  }

  getFromApi (userID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.get(userID))
      .catch(apiError)
      .then(user => _pick(user.data, userApiFields))
  }

  getLoansFromApi (userID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(userID).loans())
      .catch(apiError)
      .then(userLoans => {
        return {
          loans: Array.from(userLoans.keys())
        }
      })
  }

  getFromCache (userID) {
    return this.Model.get(userID)
      .then(user => user
        ? formatCacheUser(user)
        : (this.queue.sendMessage(userID), Promise.reject())
      )
  }
}

const formatCacheUser = user => {
  return {
    primary_id: user.primary_id,
    loans: user.loan_ids,
    requests: user.request_ids
  }
}

module.exports = ApiUser
