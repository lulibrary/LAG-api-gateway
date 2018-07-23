// Test libraries
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinonChai = require('sinon-chai')
chai.use(chaiAsPromised)
chai.use(sinonChai)
chai.should()

const sinon = require('sinon')
const sandbox = sinon.createSandbox()

const uuid = require('uuid/v4')

const rewire = require('rewire')
let wires = []

const HTTPError = require('node-http-error')

// Module under test
const CacheApi = rewire('../src/cache-api')

describe('cache api class tests', () => {
  afterEach(() => {
    wires.forEach(wire => wire())
    wires = []
    sandbox.restore()
  })

  describe('constructor tests', () => {
    it('should call the provided Schema with the tableName', () => {
      const SchemaStub = sandbox.stub()
      SchemaStub.resolves()
      const QueueStub = sandbox.stub()
      QueueStub.resolves()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      SchemaStub.should.have.been.calledWith('testTable')
    })

    it('should create a queue instance', () => {
      const SchemaStub = sandbox.stub()
      SchemaStub.resolves()
      const QueueStub = sandbox.stub()
      QueueStub.resolves()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      QueueStub.should.have.been.calledWithNew
      QueueStub.should.have.been.calledWith({
        url: 'testQueueUrl'
      })
    })

    it('should create an AlmaClient instance', () => {
      const SchemaStub = sandbox.stub()
      SchemaStub.resolves()
      const QueueStub = sandbox.stub()
      QueueStub.resolves()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      AlmaClientStub.should.have.been.calledWithNew
    })
  })

  describe('get method tests', () => {
    it('should call get on the Cache Model', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves({})
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      QueueStub.resolves()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      const testID = `test_id_${uuid()}`

      return testCache.get(testID)
        .then(() => {
          getStub.should.have.been.calledWith(testID)
        })
    })

    it('should call get on the Cache Model with the last provided ID', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves({})
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      QueueStub.resolves()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      const testID = `test_id_${uuid()}`

      return testCache.get(uuid(), uuid(), uuid(), uuid(), testID)
        .then(() => {
          getStub.should.have.been.calledWithExactly(testID)
        })
    })

    it('should resolve with the result of CacheModel#get if an item is returned', () => {
      const testItem = {
        test: uuid(),
        test2: uuid()
      }
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves(testItem)
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      QueueStub.resolves()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      const testID = `test_id_${uuid()}`

      return testCache.get(uuid(), uuid(), uuid(), uuid(), testID).should.eventually.deep.equal(testItem)
    })

    it('should call Queue#sendMessage if no item is returned', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves()
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      const sendMessageStub = sandbox.stub()
      QueueStub.returns({
        sendMessage: sendMessageStub
      })
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.returns()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => Promise.resolve()
      })

      const testID = `test_id_${uuid()}`

      return testCache.get(testID)
        .then(() => {
          sendMessageStub.should.have.been.calledWith(testID)
        })
    })

    it('should call getFromApi if no item is returned', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves()
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      QueueStub.returns({
        sendMessage: () => null
      })
      const AlmaClientStub = sandbox.stub()
      const testClient = {
        test: uuid()
      }
      AlmaClientStub.returns(testClient)

      const almaApiCallStub = sandbox.stub()
      almaApiCallStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: almaApiCallStub
      })

      const testID = `test_id_${uuid()}`

      return testCache.get(testID)
        .then(() => {
          almaApiCallStub.should.have.been.calledWith(testClient, testID)
        })
    })

    it('should call getFromApi with all provided ids', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves()
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      QueueStub.returns({
        sendMessage: () => null
      })
      const AlmaClientStub = sandbox.stub()
      const testClient = {
        test: uuid()
      }
      AlmaClientStub.returns(testClient)

      const almaApiCallStub = sandbox.stub()
      almaApiCallStub.resolves()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: almaApiCallStub
      })

      const testID1 = uuid()
      const testID2 = uuid()
      const testID3 = uuid()
      const testID4 = uuid()

      const testID = `test_id_${uuid()}`

      return testCache.get(testID1, testID2, testID3, testID4, testID)
        .then(() => {
          almaApiCallStub.should.have.been.calledWith(testClient, testID1, testID2, testID3, testID4, testID)
        })
    })

    it('should resolve with the result of getFromApi if no item is returned', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.resolves()
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      QueueStub.returns({
        sendMessage: () => null
      })
      const AlmaClientStub = sandbox.stub()
      const testClient = {
        test: uuid()
      }
      AlmaClientStub.returns(testClient)

      const almaApiCallStub = sandbox.stub()
      const testItem = {
        test: uuid(),
        test2: uuid()
      }
      almaApiCallStub.resolves(testItem)

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: almaApiCallStub
      })

      const testID = `test_id_${uuid()}`

      return testCache.get(testID).should.eventually.deep.equal(testItem)
    })

    it('should call getFromApi if CacheModel#get rejects', () => {
      const SchemaStub = sandbox.stub()
      const getStub = sandbox.stub()
      getStub.rejects()
      SchemaStub.returns({
        get: getStub
      })
      const QueueStub = sandbox.stub()
      const sendMessageStub = sandbox.stub()
      QueueStub.returns({
        sendMessage: () => sendMessageStub
      })
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.returns({})

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: () => null
      })

      const getFromApiStub = sandbox.stub(testCache, 'getFromApi')
      getFromApiStub.resolves({})

      const testID = `test_id_${uuid()}`

      return testCache.get(testID)
        .then(() => {
          getFromApiStub.should.have.been.calledWith(testID)
          sendMessageStub.should.not.have.been.called
        })
    })
  })

  describe('getFromApi tests', () => {
    it('should reject with a 400 HTTP error if the API call rejects with a response', () => {
      const SchemaStub = sandbox.stub()
      SchemaStub.returns()
      const QueueStub = sandbox.stub()
      QueueStub.returns()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.returns({})
      const almaApiCallStub = sandbox.stub()
      almaApiCallStub.rejects({ response: 'oh no' })

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testID = `test_id_${uuid()}`

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: almaApiCallStub
      })

      return testCache.getFromApi(testID)
        .catch(e => {
          e.should.be.an.instanceOf(HTTPError)
          e.message.should.equal(`No matching item with ID ${testID} found`)
          e.status.should.equal(400)
        })
    })
    it('should reject with a 500 HTTP error if the API call rejects with no response', () => {
      const SchemaStub = sandbox.stub()
      SchemaStub.returns()
      const QueueStub = sandbox.stub()
      QueueStub.returns()
      const AlmaClientStub = sandbox.stub()
      AlmaClientStub.returns({})
      const almaApiCallStub = sandbox.stub()
      almaApiCallStub.rejects()

      wires.push(
        CacheApi.__set__('Schemas', {
          TestSchema: SchemaStub
        }),
        CacheApi.__set__('Queue', QueueStub),
        CacheApi.__set__('AlmaClient', AlmaClientStub)
      )

      const testID = `test_id_${uuid()}`

      const testCache = new CacheApi({
        schema: 'TestSchema',
        tableName: 'testTable',
        queueUrl: 'testQueueUrl',
        almaApiCall: almaApiCallStub
      })

      return testCache.getFromApi(testID)
        .catch(e => {
          e.should.be.an.instanceOf(HTTPError)
          e.message.should.equal(`Unable to reach Alma`)
          e.status.should.equal(500)
        })
    })
  })
})
