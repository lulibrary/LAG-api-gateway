const { Queue } = require('@lulibrary/lag-utils')
const HttpError = require('node-http-error')

const AlmaClient = require('alma-api-wrapper')
const getAlmaApiKey = require('../../get-alma-api-key')

class ApiObject {
  constructor (config) {
    this.queue = new Queue({ url: config.queueUrl })
    this.Model = config.schema(config.tableName)
  }

  getFromCache (ID) {
    return this.Model.getValid(ID)
      .then(item => item || Promise.reject(new Error('Invalid cache object')))
  }

  getFromApi (...ids) {
    return this._ensureApi()
      .then(() => this.apiCall(...ids))
      .catch(() => {
        throw new HttpError(400, this.errorMessage)
      })
      .then(item => item.data)
  }

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
