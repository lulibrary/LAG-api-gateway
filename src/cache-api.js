const Schemas = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')
const AlmaClient = require('alma-api-wrapper')

const HTTPError = require('node-http-error')

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
      .catch(e => this.getFromApi(...ids))
      .then(item => item || (this.queue.sendMessage(id), this.getFromApi(...ids)))
  }

  getFromApi (...ids) {
    return this.almaApiCall(this.almaApi, ...ids)
      .catch(e => {
        if (e.response) {
          throw new HTTPError(400, `No matching item with ID ${ids[ids.length - 1]} found`)
        } else {
          throw new HTTPError(500, 'Unable to reach Alma')
        }
      })
  }
}

module.exports = CacheApi
