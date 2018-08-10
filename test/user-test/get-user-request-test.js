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
const testTableName = `test_request_table_${uuid()}`
process.env.REQUEST_CACHE_TABLE_NAME = testTableName
const testQueueUrl = `test_requests_queue_${uuid()}`
process.env.REQUESTS_QUEUE_URL = testQueueUrl

let stubs = require('../mocks.js')
const getItemStub = stubs.getItemStub
const describeTableStub = stubs.describeTableStub

// Module under test
let requestPathHandler = require('../../src/user/get-user-request')
const handle = (event, ctx) => new Promise((resolve, reject) => {
  requestPathHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

const mockTable = (tableName) => {
  describeTableStub.callsArgWith(1, null, {
    Table: {
      AttributeDefinitions: [{
        AttributeName: 'request_id',
        KeyType: 'HASH'
      }],
      KeySchema: [{
        AttributeName: 'request_id',
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

describe('/user/<userID>/requests/<requestID> path end to end tests', function () {
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

  it('should query the Cache for a Request record', () => {
    sandbox.stub(Date, 'now').returns(0)
    process.env.ALMA_KEY = 'key'

    const testUserID = `test_user_${uuid()}`
    const testRequestID = `test_request_${uuid()}`
    const testUserRecord = {
      Item: {
        request_id: {
          S: testRequestID
        },
        record_expiry_date: {
          N: '2147483647'
        }
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
        userID: testUserID,
        requestID: testRequestID
      }
    }, {})
      .then(res => {
        getItemStub.should.have.been.calledWith({
          TableName: testTableName,
          Key: {
            request_id: {
              S: testRequestID
            }
          }
        })
      })
  })

  it('should query the Alma API if no Request is in the Cache', () => {
    sandbox.stub(Date, 'now').returns(0)
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    getItemStub.callsArgWith(1, null, { })
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`
    const testRequestID = `test_request_${uuid()}`

    let urlQueries = []

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')
      .get((uri) => {
        urlQueries.push(uri)
        return true
      })
      .reply(200, {
        request_id: testRequestID
      })

    return handle({
      pathParameters: {
        userID: testUserID,
        requestID: testRequestID
      }
    }, {})
      .then(() => {
        urlQueries.should.include(`/almaws/v1/users/${testUserID}/requests/${testRequestID}?format=json`)
      })
  })

  // it('should call SQS#sendMessage if no Request is in the Cache', () => {
  //   const sendMessageStub = sandbox.stub()
  //   sendMessageStub.callsArgWith(1, null, true)
  //   AWS_MOCK.mock('SQS', 'sendMessage', sendMessageStub)
  //   getItemStub.callsArgWith(1, null, { })
  //   // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
  //   mocks.push('SQS')
  //   const getParameterStub = sandbox.stub()
  //   getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
  //   AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
  //   mocks.push('SSM')

  //   const testUserID = `test_user_${uuid()}`
  //   const testRequestID = `test_request_${uuid()}`

  //   nock('https://api-eu.hosted.exlibrisgroup.com')
  //     .get(uri => true)
  //     .reply(200, {
  //       request_id: testRequestID
  //     })

  //   return handle({
  //     pathParameters: {
  //       userID: testUserID,
  //       requestID: testRequestID
  //     }
  //   })
  //     .then(() => {
  //       sendMessageStub.should.have.been.calledWith({
  //         QueueUrl: testQueueUrl,
  //         MessageBody: JSON.stringify({
  //           userID: testUserID,
  //           requestID: testRequestID
  //         })
  //       })
  //     })
  // })

  it('should return an error if it cannot get the request from the cache or the API', () => {
    sandbox.stub(Date, 'now').returns(0)
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    getItemStub.callsArgWith(1, null, { })
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    // sandbox.stub(console, 'log')

    const testUserID = `test_user_${uuid()}`
    const testRequestID = `test_request_${uuid()}`

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
        requestID: testRequestID
      }
    }, {})
      .catch(e => {
        console.log(e)
        e.statusCode.should.equal(400)
      })
  })
})
