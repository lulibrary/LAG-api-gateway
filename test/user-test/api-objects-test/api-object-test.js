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

const AlmaClient = require('alma-api-wrapper')

// Module under test
const ApiObject = rewire('../../../src/user/api-objects/api-object')

describe('base api object tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('_ensureApi method tests', () => {
    it('should resolve with the alma Api if it already exists', () => {
      const testObject = new ApiObject({ queueUrl: uuid() })
      const testApi = {
        api: uuid()
      }

      testObject.almaApi = testApi

      return testObject._ensureApi().should.eventually.deep.equal(testApi)
    })

    it('should call getAlmaApiKey if the alma Api doesn\'t exist', () => {
      const getKeyStub = sandbox.stub()
      getKeyStub.resolves()
      wires.push(ApiObject.__set__('getAlmaApiKey', getKeyStub))

      process.env.ALMA_KEY = 'key'
      const testObject = new ApiObject({ queueUrl: uuid() })

      return testObject._ensureApi()
        .then(() => {
          getKeyStub.should.have.been.calledOnce
        })
    })

    it('should create a new instance of AlmaClient on the Object', () => {
      const getKeyStub = sandbox.stub()
      getKeyStub.resolves()
      wires.push(ApiObject.__set__('getAlmaApiKey', getKeyStub))

      process.env.ALMA_KEY = 'key'
      const testObject = new ApiObject({ queueUrl: uuid() })

      return testObject._ensureApi()
        .then(() => {
          testObject.almaApi.should.be.an.instanceOf(AlmaClient)
        })
    })
  })
})
