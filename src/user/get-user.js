'use strict'
const CacheApi = require('../cache-api')
const handleError = require('../handle-error')

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID

  // handleUser(userID)
  handleUser(userID)
    .then(response => {
      callback(null, {
        statusCode: 200,
        body: JSON.stringify(response)
      })
    })
    .catch(e => {
      callback(handleError(e))
    })
}

const handleUser = (userID) => {
  return new CacheApi({
    queueUrl: process.env.USERS_QUEUE_URL,
    schema: 'UserSchema',
    tableName: process.env.USER_CACHE_TABLE_NAME,
    almaApiCall: (api, userID) => api.users.get(userID)
  }).get(userID)
}
