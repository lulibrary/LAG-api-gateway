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

  describe('handler tests', () => {
    it('should call handleUser with the user ID', () => {
      const handleUserStub = sandbox.stub()
      handleUserStub.resolves()
      wires.push(
        userPathHandler.__set__('handleUser', handleUserStub)
      )

      const testUserID = `test_user_${uuid()}`

      const testEvent = {
        pathParameters: {
          userID: testUserID
        }
      }

      return handle(testEvent, {})
        .then(() => {
          handleUserStub.should.have.been.calledWith(testUserID)
        })
    })

    it('should callback with the handleUser response if it resolves', () => {
      const testUserID = `test_user_${uuid()}`

      const testResponse = {
        primary_id: testUserID,
        loan_ids: [uuid(), uuid(), uuid()],
        request_ids: [uuid(), uuid(), uuid()]
      }

      const expected = {
        statusCode: 200,
        body: JSON.stringify(testResponse)
      }
      const handleUserStub = sandbox.stub()
      handleUserStub.resolves(testResponse)
      wires.push(
        userPathHandler.__set__('handleUser', handleUserStub)
      )

      const testEvent = {
        pathParameters: {
          userID: testUserID
        }
      }

      return handle(testEvent, {}).should.eventually.deep.equal(expected)
    })

    it('should call handleError if handleUser rejects', () => {
      const testUserID = `test_user_${uuid()}`

      const handleUserStub = sandbox.stub()
      handleUserStub.rejects(new Error('oh no'))
      const handleErrorStub = sandbox.stub()
      handleErrorStub.returns()
      wires.push(
        userPathHandler.__set__('handleUser', handleUserStub),
        userPathHandler.__set__('handleError', handleErrorStub)
      )

      const testEvent = {
        pathParameters: {
          userID: testUserID
        }
      }

      return handle(testEvent, {})
        .catch(() => {
          handleErrorStub.should.have.been.calledWith(new Error('oh no'))
        })
    })

    it('should callback with the result of handleError for a rejection', () => {
      const testUserID = `test_user_${uuid()}`

      const errorResponse = {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Internal Server Error'
        })
      }

      const handleUserStub = sandbox.stub()
      handleUserStub.rejects(new Error('oh no'))
      const handleErrorStub = sandbox.stub()
      handleErrorStub.returns(errorResponse)
      wires.push(
        userPathHandler.__set__('handleUser', handleUserStub),
        userPathHandler.__set__('handleError', handleErrorStub)
      )

      const testEvent = {
        pathParameters: {
          userID: testUserID
        }
      }

      return handle(testEvent, {}).should.eventually.be.rejectedWith(errorResponse)
    })
  })

  /*
  describe('handleUser method tests', () => {
    const handleUser = userPathHandler.__get__('handleUser')

    it('should create an instance of CacheApi', () => {
      const testUserID = `test_user_${uuid()}`
      const cacheApiStub = sandbox.stub()
      cacheApiStub.returns({
        get: () => Promise.resolve()
      })
      wires.push(userPathHandler.__set__('CacheApi', cacheApiStub))

      return handleUser(testUserID)
        .then(() => {
          cacheApiStub.should.have.been.calledWithNew
        })
    })

    it('should call CacheApi#get with the user ID', () => {
      const testUserID = `test_user_${uuid()}`
      const getStub = sandbox.stub()
      getStub.resolves()
      const cacheApiStub = sandbox.stub()
      cacheApiStub.returns({
        get: getStub
      })
      wires.push(userPathHandler.__set__('CacheApi', cacheApiStub))

      return handleUser(testUserID)
        .then(() => {
          getStub.should.have.been.calledWith(testUserID)
        })
    })
  })
    */
})
