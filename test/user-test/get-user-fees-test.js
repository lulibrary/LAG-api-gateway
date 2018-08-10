// Test libraries
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinonChai = require('sinon-chai')
chai.use(chaiAsPromised)
chai.use(sinonChai)
chai.should()

const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const nock = require('nock')

const uuid = require('uuid/v4')

const AWS_MOCK = require('aws-sdk-mock')
let mocks = []

process.env.ALMA_API_KEY_NAME = 'key'
const testTableName = `test_user_table_${uuid()}`
const testUsersQueueUrl = `test_users_queue_${uuid()}`
const testFeeTableName = `test_fee_table_${uuid()}`

let stubs = require('../mocks.js')
const getItemStub = stubs.getItemStub
const describeTableStub = stubs.describeTableStub

// Module under test
let userPathHandler = require('../../src/user/get-user-fees')
const handle = (event, ctx) => new Promise((resolve, reject) => {
  userPathHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

const mockTable = (tableName) => {
  describeTableStub.callsArgWith(1, null, {
    Table: {
      AttributeDefinitions: [{
        AttributeName: 'primary_id',
        KeyType: 'HASH'
      }],
      KeySchema: [{
        AttributeName: 'primary_id',
        KeyType: 'HASH'
      }],
      ItemCount: 100,
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
      },
      TableArn: `arn:aws:dynamodb:table:someuser:${tableName}`,
      TableName: tableName,
      TableStatus: 'ACTIVE'
    }
  })
}

describe('user/<userID>/fees path end to end tests', function () {
  this.timeout(5000)

  before(() => {
    mockTable(testTableName)
    process.env.USER_CACHE_TABLE_NAME = testTableName
    process.env.FEE_CACHE_TABLE_NAME = testFeeTableName
    process.env.USERS_QUEUE_URL = testUsersQueueUrl
    process.env.FEES_QUEUE_URL = uuid()
  })

  afterEach(() => {
    sandbox.restore()
    getItemStub.reset()
    mocks.forEach(mock => AWS_MOCK.restore(mock))
    mocks = []
  })

  it('should query the Cache for a User record', () => {
    process.env.ALMA_KEY = 'key'

    const testUserID = `test_user_${uuid()}`
    const testUserRecord = {
      Item: {
        primary_id: {
          S: testUserID
        },
        expiry_date: {
          N: '2147483647'
        },
        fee_ids: []
      }
    }
    getItemStub.callsArgWith(1, null, testUserRecord)
    // AWS_MOCK.mock('DynamoDB', 'getItem', getItemStub)
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(res => {
        getItemStub.should.have.been.calledWith({
          TableName: testTableName,
          Key: {
            primary_id: {
              S: testUserID
            }
          }
        })
      })
  })

  it('should query the Alma API if no User is in the Cache', () => {
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    getItemStub.callsArgWith(1, null, { })
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`

    let urlQueries = []

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')
      .get((uri) => {
        urlQueries.push(uri)
        return true
      })
      .reply(200, {
        item_fee: []
      })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(() => {
        urlQueries.should.include(`/almaws/v1/users/${testUserID}/fees?format=json`)
      })
  })

  it('should call SQS#sendMessage if no User is in the Cache', () => {
    const sendMessageStub = sandbox.stub()
    sendMessageStub.callsArgWith(1, null, true)
    AWS_MOCK.mock('SQS', 'sendMessage', sendMessageStub)
    getItemStub.callsArgWith(1, null, { })
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`
    nock('https://api-eu.hosted.exlibrisgroup.com')
      .get(uri => true)
      .reply(200, {
        item_fee: []
      })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    })
      .then(() => {
        sendMessageStub.should.have.been.calledWith({
          QueueUrl: testUsersQueueUrl,
          MessageBody: testUserID
        })
      })
  })

  it('should return an error if it cannot get the user from the cache or the API', () => {
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    mocks.push('SQS')
    getItemStub.callsArgWith(1, null, { })
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    // sandbox.stub(console, 'log')

    const testUserID = `test_user_${uuid()}`
    const testFeeID = `test_fee_${uuid()}`

    let urlQueries = []

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')
      .get((uri) => {
        urlQueries.push(uri)
        return true
      })
      .reply(400, {
        message: 'Missing API key'
      })

    return handle({
      pathParameters: {
        userID: testUserID,
        feeID: testFeeID
      }
    }, {})
      .catch(e => {
        e.statusCode.should.equal(400)
      })
  })

  it('should query the Cache for each Fee record on the User', () => {
    const testUserID = `test_user_${uuid()}`
    const testFeeIDs = [uuid(), uuid(), uuid(), uuid()]

    getItemStub.onCall(0).callsArgWith(1, null, {
      Item: {
        primary_id: {
          S: testUserID
        },
        expiry_date: {
          N: '2147483647'
        },
        fee_ids: testFeeIDs
      }
    })

    testFeeIDs.forEach((id, index) => {
      getItemStub.onCall(index + 1).callsArgWith(1, null, {
        Item: {
          id: {
            S: id
          },
          expiry_date: {
            N: '2147483647'
          }
        }
      })
    })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(() => {
        testFeeIDs.forEach(feeID => {
          getItemStub.should.have.been.calledWith({
            TableName: testFeeTableName,
            Key: {
              id: {
                S: feeID
              }
            }
          })
        })
      })
  })

  it('should call the Alma Api for any Fees which are not in the Cache', () => {
    const testUserID = `test_user_${uuid()}`
    const testFeeIDs = [uuid(), uuid(), uuid(), uuid()]

    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    mocks.push('SQS')

    getItemStub.onCall(0).callsArgWith(1, null, {
      Item: {
        primary_id: {
          S: testUserID
        },
        expiry_date: {
          N: '2147483647'
        },
        fee_ids: testFeeIDs
      }
    })

    const feeItem = (id) => {
      return {
        Item: {
          id: {
            S: id
          }
        }
      }
    }

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')

    testFeeIDs.forEach((feeID, index) => {
      getItemStub.onCall(index + 1).callsArgWith(1, null, index % 2 === 0 ? feeItem(feeID) : {})

      if (index % 2 === 1) {
        alma.get(`/almaws/v1/users/${testUserID}/fees/${feeID}?format=json`)
          .reply(200, {
            id: feeID
          })
      }
    })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(res => {
        testFeeIDs.forEach((feeID, index) => {
          if (index % 2 === 0) {
            getItemStub.should.have.been.calledWith({
              TableName: testFeeTableName,
              Key: {
                id: {
                  S: feeID
                }
              }
            })
          }
        })
      })
  })

  it('should resolve with any existing fees if an Alma API call rejects', () => {
    const testUserID = `test_user_${uuid()}`
    const testFeeIDs = [uuid(), uuid(), uuid(), uuid(), uuid()]

    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    mocks.push('SQS')

    getItemStub.onCall(0).callsArgWith(1, null, {
      Item: {
        primary_id: {
          S: testUserID
        },
        expiry_date: {
          N: '2147483647'
        },
        fee_ids: testFeeIDs
      }
    })

    const feeItem = (id) => {
      return {
        Item: {
          id: {
            S: id
          },
          expiry_date: {
            N: '2147483647'
          }
        }
      }
    }

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')

    alma.get(`/almaws/v1/users/${testUserID}/fees/${testFeeIDs[0]}?format=json`)
      .reply(400, {
        message: 'item not found'
      })
    getItemStub.onCall(1).callsArgWith(1, null, {})
    testFeeIDs.slice(1).forEach((feeID, index) => {
      getItemStub.onCall(index + 2).callsArgWith(1, null, index % 2 === 0 ? feeItem(feeID) : {})

      if (index % 2 === 1) {
        alma.get(`/almaws/v1/users/${testUserID}/fees/${feeID}?format=json`)
          .reply(200, {
            id: feeID
          })
      }
    })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(res => {
        JSON.parse(res.body).should.deep.equal(
          testFeeIDs.slice(1).map(id => {
            return {
              id: id
            }
          })
        )
      })
  })
})
