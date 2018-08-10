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
const testQueueUrl = `test_users_queue_${uuid()}`

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

const stubResources = (callNo = 1) => {
  const resourceIDs = ['loan_id', 'request_id', 'id']
  const expiryFields = ['expiry_date', 'record_expiry_date', 'expiry_date']

  resourceIDs.forEach((ID, index) => {
    getItemStub.onCall(callNo + index).callsArgWith(1, null, {
      [ID]: {
        S: uuid()
      },
      [expiryFields[index]]: {
        N: '2147483647'
      }
    })
  })
}

describe('user path end to end tests', function () {
  this.timeout(10000)

  before(() => {
    mockTable(testTableName)
    process.env.USER_CACHE_TABLE_NAME = testTableName
    process.env.USERS_QUEUE_URL = testQueueUrl
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
        fee_ids: {
          L: []
        },
        expiry_date: {
          N: '1600000000'
        }
      }
    }
    getItemStub.onCall(0).callsArgWith(1, null, testUserRecord)
    stubResources()
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
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
    getItemStub.onCall(0).callsArgWith(1, null, { })
    stubResources()
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`

    let urlQueries = []

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')

    alma.get(uri => {
      urlQueries.push(uri)
      return false
    }).reply(400, {})

    const subCalls = ['loans', 'requests', 'fees']
    subCalls.forEach(call => {
      alma.get(`/almaws/v1/users/${testUserID}/${call}?format=json`)
        .reply(200, [])
    })

    return handle({
      pathParameters: {
        userID: testUserID
      }
    }, {})
      .then(() => {
        subCalls.forEach(call => {
          urlQueries.should.include(`/almaws/v1/users/${testUserID}/${call}?format=json`)
        })
      })
  })

  it('should call SQS#sendMessage if no User is in the Cache', () => {
    const sendMessageStub = sandbox.stub()
    sendMessageStub.callsArgWith(1, null, true)
    AWS_MOCK.mock('SQS', 'sendMessage', sendMessageStub)
    getItemStub.onCall(0).callsArgWith(1, null, { })
    stubResources()
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')

    const subCalls = ['loans', 'requests', 'fees']
    subCalls.forEach(call => {
      alma.get(`/almaws/v1/users/${testUserID}/${call}?format=json`)
        .reply(200, [])
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
