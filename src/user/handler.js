'use strict'
const { UserSchema } = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')
const AlmaClient = require('alma-api-wrapper')

const handleError = require('../handle-error')

const CacheUser = UserSchema(process.env.USER_CACHE_TABLE_NAME)

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID

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
  return CacheUser.get(userID)
    .then(user => user || (sendUserToQueue(userID), getUserFromApi(userID)))
    .catch(e => {
      return getUserFromApi(userID)
    })
}

const getUserFromApi = (userID) => {
  const almaApi = new AlmaClient()
  return almaApi.users.get(userID)
    .then(apiUser => {
      return apiUser.data
    })
}

const sendUserToQueue = (userID) => {
  const usersQueue = new Queue({
    url: process.env.USERS_QUEUE_URL
  })
  return usersQueue.sendMessage(userID)
}
