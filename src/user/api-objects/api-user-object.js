const HttpError = require('node-http-error')

const ApiObject = require('./api-object')

class ApiUserObject extends ApiObject {
  getAllFromApi (userID) {
    return this._ensureApi()
      .then(() => this.getAllApiCall(userID))
      .catch(() => {
        throw new HttpError(400, 'No user with matching ID found')
      })
  }
}

module.exports = ApiUserObject
