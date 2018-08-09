const Schemas = require('@lulibrary/lag-alma-utils')
const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

class ApiLoan extends ApiObject {
  constructor () {
    super({
      queueUrl: process.env.REQUESTS_QUEUE_URL,
      schema: Schemas.RequestSchema,
      tableName: process.env.REQUEST_CACHE_TABLE_NAME
    })
  }

  get (userID, loanID) {
    return this.getFromCache(userID, loanID)
      .catch(() => this.getFromApi(userID, loanID))
  }

  getFromApi (userID, loanID) {
    return this._ensureApi()
      .then(() => this.almaApi.users.for(userID).getLoan(loanID))
      .catch(e => {
        throw new HttpError(400, 'No loan with matching ID found')
      })
      .then(loan => loan.data)
  }

  getFromCache (userID, loanID) {
    return this.Model.get(loanID)
      .then(loan => loan || (this.queue.sendMessage(JSON.stringify({
        userID,
        loanID
      })), Promise.reject()))
  }
}

module.exports = ApiLoan
