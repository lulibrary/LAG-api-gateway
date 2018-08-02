const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

const _pick = require('lodash.pick')

const ApiUserLoan = require('./api-user-loan')

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
    this.almaReachable = true
  }

  get (userID) {
    return this.getFromCache(userID)
      .catch(() => this.getFromApi(userID))
  }

  getLoans (userID) {
    const loanResolver = new ApiUserLoan()

    return this.getLoanIDs(userID)
      .then(loans => {
        return Promise.all(
          loans.map(loanID =>
            loanResolver
              .get(userID, loanID)
              .catch(e => {
                return null
              }))
        )
          .then(loans => loans.filter(loan => loan))
      })
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

const apiError = e => {
  throw new HttpError(400, 'No user with matching ID found')
}

module.exports = ApiUser
