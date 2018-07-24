const CacheApi = require('./cache-api')

class CacheUser extends CacheApi {
  constructor (options) {
    super({
      queueUrl: process.env.USERS_QUEUE_URL,
      tableName: process.env.USER_CACHE_TABLE_NAME,
      schema: 'UserSchema'
    })
  }

  getFromCache () {
    this.model.get(userID)
      
  }

  get (userID) {
    
  }
}
