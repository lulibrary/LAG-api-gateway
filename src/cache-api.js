const Schemas = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')
const AlmaClient = require('alma-api-wrapper')

class CacheApi {
  constructor (options) {
    this.CacheModel = Schemas[options.schema](options.tableName)
    this.queue = new Queue({ url: options.queueUrl })
    this.almaApi = new AlmaClient()
    this.almaApiCall = options.almaApiCall
  }

  get (...ids) {
    const id = ids[ids.length - 1]
    return this.CacheModel.get(id)
      .then(item => item || (this.queue.sendMessage(id), this.almaApiCall(this.almaApi, ...ids)))
  }
}

module.exports = CacheApi
