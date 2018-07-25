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
  constructor (userID) {
    super()
    this.userID = userID
    this.Model = Schemas.UserSchema(process.env.USER_CACHE_TABLE_NAME)
    this.queue = new Queue({ url: process.env.USERS_QUEUE_URL })
  }

  get () {
    return this.getFromCache()
      .catch(() => this.getFromApi())
  }

  getFromApi () {
    return this._ensureApi()
      .then(() => this.almaApi.users.get(this.userID))
      .catch(apiError)
      .then(user => _pick(user.data, userApiFields))
  }

  getFromCache () {
    return this.Model.get(this.userID)
      .then(user => user
        ? formatCacheUser(user)
        : (this.queue.sendMessage(this.userID), Promise.reject())
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
