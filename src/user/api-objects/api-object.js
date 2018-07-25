const { Queue } = require('@lulibrary/lag-utils')

const AlmaClient = require('alma-api-wrapper')
const getAlmaApiKey = require('../../get-alma-api-key')

class ApiObject {
  constructor (config) {
    this.queue = new Queue({ url: config.queueUrl })
    this.Model = config.schema(config.tableName)
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
