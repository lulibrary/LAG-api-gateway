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
process.env.USER_CACHE_TABLE_NAME = testTableName
const testQueueUrl = `test_users_queue_${uuid()}`
process.env.USERS_QUEUE_URL = testQueueUrl

let stubs = require('../mocks.js')
const getItemStub = stubs.getItemStub
const describeTableStub = stubs.describeTableStub
stubs.test = 1

// Module under test
let userPathHandler = require('../../src/user/get-user')
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

describe('user path end to end tests', function () {
  this.timeout(10000)

  before(() => {
    mockTable(testTableName)
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
        loan_ids: {
          L: []
        },
        request_ids: {
          L: []
        },
        expiry_date: {
          N: '1600000000'
        }
      }
    }
    getItemStub.callsArgWith(1, null, testUserRecord)
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Value: 'key' })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)

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
    getParameterStub.callsArgWith(1, null, { Value: 'key' })
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
        primary_id: testUserID
      })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(() => {
        urlQueries.should.include(`/almaws/v1/users/${testUserID}?format=json`)
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
    getParameterStub.callsArgWith(1, null, { Value: 'key' })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`

    nock('https://api-eu.hosted.exlibrisgroup.com')
      .get(uri => true)
      .reply(200, {
        primary_id: testUserID
      })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    })
      .then(() => {
        sendMessageStub.should.have.been.calledWith({
          QueueUrl: testQueueUrl,
          MessageBody: testUserID
        })
      })
  })
})
