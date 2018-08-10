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
const testTableName = `test_fee_table_${uuid()}`
process.env.FEE_CACHE_TABLE_NAME = testTableName
const testQueueUrl = `test_fees_queue_${uuid()}`
process.env.FEES_QUEUE_URL = testQueueUrl

let stubs = require('../mocks.js')
const getItemStub = stubs.getItemStub
const describeTableStub = stubs.describeTableStub

// Module under test
let userPathHandler = require('../../src/user/get-user-fee')
const handle = (event, ctx) => new Promise((resolve, reject) => {
  userPathHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

const mockTable = (tableName) => {
  describeTableStub.callsArgWith(1, null, {
    Table: {
      AttributeDefinitions: [{
        AttributeName: 'fee_id',
        KeyType: 'HASH'
      }],
      KeySchema: [{
        AttributeName: 'fee_id',
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

describe('/user/<userID>/fees/<feeID> path end to end tests', function () {
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

  it('should query the Cache for a Fee record', () => {
    process.env.ALMA_KEY = 'key'

    const testUserID = `test_user_${uuid()}`
    const testFeeID = `test_fee_${uuid()}`
    const testUserRecord = {
      Item: {
        id: {
          S: testFeeID
        },
        expiry_date: {
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
        feeID: testFeeID
      }
    }, {})
      .then(res => {
        getItemStub.should.have.been.calledWith({
          TableName: testTableName,
          Key: {
            id: {
              S: testFeeID
            }
          }
        })
      })
  })

  it('should query the Alma API if no Fee is in the Cache', () => {
    AWS_MOCK.mock('SQS', 'sendMessage', {})
    getItemStub.callsArgWith(1, null, { })
    // AWS_MOCK.mock('DynamoDB', 'getItem', cacheGetStub)
    mocks.push('SQS')
    const getParameterStub = sandbox.stub()
    getParameterStub.callsArgWith(1, null, { Parameter: { Value: 'key' } })
    AWS_MOCK.mock('SSM', 'getParameter', getParameterStub)
    mocks.push('SSM')

    const testUserID = `test_user_${uuid()}`
    const testFeeID = `test_fee_${uuid()}`

    let urlQueries = []

    const alma = nock('https://api-eu.hosted.exlibrisgroup.com')
      .get((uri) => {
        urlQueries.push(uri)
        return true
      })
      .reply(200, {
        id: testFeeID
      })

    return handle({
      pathParameters: {
        userID: testUserID,
        feeID: testFeeID
      }
    }, {})
      .then(() => {
        urlQueries.should.include(`/almaws/v1/users/${testUserID}/fees/${testFeeID}?format=json`)
      })
  })

  // it('should call SQS#sendMessage if no Fee is in the Cache', () => {
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
  //   const testFeeID = `test_fee_${uuid()}`

  //   nock('https://api-eu.hosted.exlibrisgroup.com')
  //     .get(uri => true)
  //     .reply(200, {
  //       id: testFeeID
  //     })

  //   return handle({
  //     pathParameters: {
  //       userID: testUserID,
  //       feeID: testFeeID
  //     }
  //   })
  //     .then(() => {
  //       sendMessageStub.should.have.been.calledWith({
  //         QueueUrl: testQueueUrl,
  //         MessageBody: JSON.stringify({
  //           userID: testUserID,
  //           feeID: testFeeID
  //         })
  //       })
  //     })
  // })

  it('should return an error if it cannot get the fee from the cache or the API', () => {
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
})
