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

const ApiUser = require('../../src/user/api-objects/api-user')

// Module under test
const userPathHandler = rewire('../../src/user/get-user')
const handle = (event, ctx) => new Promise((resolve, reject) => {
  userPathHandler.handle(event, ctx, (err, res) => {
    return err ? reject(err) : resolve(res)
  })
})

describe('user path handler', () => {
  afterEach(() => {
    sandbox.restore()
    wires.forEach(wire => wire())
    wires = []
  })

  describe('handleUser method tests', () => {
    it('should create an instance of ApiUser', () => {
      const testUserID = `test_user_${uuid()}`
      const apiUserStub = sandbox.stub()
      apiUserStub.returns({
        get: () => Promise.resolve()
      })
      wires.push(userPathHandler.__set__('ApiUser', apiUserStub))

      return handle({ pathParameters: { userID: testUserID } })
        .then(() => {
          apiUserStub.should.have.been.calledWithNew
        })
    })

    it('should call ApiUser#get', () => {
      const testUserID = `test_user_${uuid()}`
      const getStub = sandbox.stub()
      getStub.resolves()
      const apiUserStub = sandbox.stub()
      apiUserStub.returns({
        get: getStub
      })
      wires.push(userPathHandler.__set__('ApiUser', apiUserStub))

      return handle({ pathParameters: { userID: testUserID } })
        .then(() => {
          getStub.should.have.been.calledOnce
          getStub.should.have.been.calledWith(testUserID)
        })
    })

    it('should call handleError if ApiUser#get rejects', () => {
      const testUserID = `test_user_${uuid()}`

      const testError = new Error('could not get user')

      const apiUserStub = sandbox.stub()
      apiUserStub.returns({
        get: () => Promise.reject(testError)
      })
      const handleErrorStub = sandbox.stub()
      handleErrorStub.returns()

      wires.push(userPathHandler.__set__('ApiUser', apiUserStub))
      wires.push(userPathHandler.__set__('handleError', handleErrorStub))

      return handle({ pathParameters: { userID: testUserID } })
        .then(() => {
          handleErrorStub.should.have.been.calledWith(testError)
        })
    })
  })
})
