const AlmaClient = require('alma-api-wrapper')
const getAlmaApiKey = require('../../get-alma-api-key')

class ApiObject {
  _ensureApi () {
    return this.almaApi
      ? Promise.resolve(this.almaApi)
      : getAlmaApiKey().then(() => {
        this.almaApi = new AlmaClient()
        return this.almaApi
      })
  }
}

module.exports = ApiObject
