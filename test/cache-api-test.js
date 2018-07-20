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
        almaApiCall: () => null
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
  })
})
