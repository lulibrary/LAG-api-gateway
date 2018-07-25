'use strict'
const Schemas = require('@lulibrary/lag-alma-utils')
const { Queue } = require('@lulibrary/lag-utils')
const AlmaClient = require('alma-api-wrapper')

const _pick = require('lodash.pick')
const handleError = require('../handle-error')
const apiError = require('../api-error')
const getAlmaApiKey = require('../get-alma-api-key')

const UserModel = Schemas.UserSchema(process.env.USER_CACHE_TABLE_NAME)

const ApiUser = require('./api-objects/api-user')

const userApiFields = [
  'primary_id',
  'loans',
  'requests'
]

module.exports.handle = (event, context, callback) => {
  const userID = event.pathParameters.userID

  // handleUser(userID)
  new ApiUser(userID).get()
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

/*
const handleUser = (userID) => {
  return UserModel.get(userID)
    .then(user => user
      ? formatCacheUser(user)
      : (sendToQueue(userID), Promise.reject())
    )
    .catch(e => getUserFromApi(userID))
}

const sendToQueue = (message) => {
  return new Queue({ url: process.env.USERS_QUEUE_URL })
    .sendMessage(message)
}

const formatCacheUser = user => {
  return {
    primary_id: user.primary_id,
    loans: user.loan_ids,
    requests: user.request_ids
  }
}

const getUserFromApi = userID => {
  return getAlmaApiKey()
    .then(() => new AlmaClient().users.get(userID))
    .catch(apiError)
    .then(user => user.data)
    .then(userData => _pick(userData, userApiFields))
}
*/
