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
const ApiUser = rewire('../../../src/user/api-objects/api-user')

const wire = (name) => {
  const stub = sandbox.stub()
  stub.resolves()
  wires.push(ApiUser.__set__(name, stub))
  return stub
}

const stubMethod = (name, resolve = true, resolution = null) => {
  const stub = sandbox.stub(ApiUser.prototype, name)
  resolve ? stub.resolves(resolution) : stub.rejects(resolution)
  return stub
}

describe('api user class tests', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('get method tests', () => {
    it('should call getFromCache with the provided ID', () => {
      const getFromCacheStub = stubMethod('getFromCache')
      wire('formatCacheUser')

      const testApiUser = new ApiUser()
      const testUserID = uuid()

      return testApiUser.get(testUserID)
        .then(() => {
          getFromCacheStub.should.have.been.calledWith(testUserID)
        })
    })

    it('should call getFromApi with the ID if getFromCache rejects', () => {
      stubMethod('getFromCache', false)
      const getFromApiStub = stubMethod('getFromApi')
      const testApiUser = new ApiUser()
      sandbox.stub(testApiUser.queue, 'sendMessage').resolves()

      const testUserID = uuid()

      return testApiUser.get(testUserID)
        .then(() => {
          getFromApiStub.should.have.been.calledWith(testUserID)
        })
    })
  })

  describe('getFromApi method tests', () => {
    it('should call _ensureApi', () => {
      const ensureApiStub = stubMethod('_ensureApi')
      const testApiUser = new ApiUser()
      testApiUser.almaApi = { users: { get: () => Promise.resolve({ data: {} }) } }

      const testUserID = uuid()

      return testApiUser.getFromApi(testUserID)
        .then(() => {
          ensureApiStub.should.have.been.calledOnce
        })
    })

    it('should get the user data from the API', () => {
      stubMethod('_ensureApi')
      const apiGetStub = sandbox.stub()
      apiGetStub.resolves({ data: {} })
      const testApiUser = new ApiUser()
      testApiUser.almaApi = { users: { get: apiGetStub } }

      const testUserID = uuid()

      return testApiUser.getFromApi(testUserID)
        .then(() => {
          apiGetStub.should.have.been.calledWith(testUserID)
        })
    })
  })
})
