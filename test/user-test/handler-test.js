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

// Module dependencies for mocking
const { Queue } = require('@lulibrary/lag-utils')
const AlmaClient = require('alma-api-wrapper')
const AlmaUser = require('alma-api-wrapper/src/user')

// Module under test
const userPathHandler = rewire('../../src/user/handler')
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

  describe('handleUser method tests', () => {
    const handleUser = userPathHandler.__get__('handleUser')

    it('should call get on the User Model', () => {
      const testUserID = `test_user_${uuid()}`
      const getStub = sandbox.stub()
      getStub.resolves()
      const CacheUserProxy = {
        get: getStub
      }

      wires.push(
        userPathHandler.__set__('CacheUser', CacheUserProxy),
        userPathHandler.__set__('sendUserToQueue', () => Promise.resolve()),
        userPathHandler.__set__('getUserFromApi', () => Promise.resolve())
      )

      return handleUser(testUserID)
        .then(() => {
          getStub.should.have.been.calledWith(testUserID)
        })
    })

    it('should resolve with the user if CacheUser#get resolves with a user', () => {
      const testUserID = `test_user_${uuid()}`
      const testLoans = [uuid(), uuid()]
      const testRequests = [uuid(), uuid(), uuid()]

      const getStub = sandbox.stub()
      getStub.resolves({
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: testRequests
      })
      const CacheUserProxy = {
        get: getStub
      }

      wires.push(
        userPathHandler.__set__('CacheUser', CacheUserProxy),
        userPathHandler.__set__('sendUserToQueue', () => Promise.resolve()),
        userPathHandler.__set__('getUserFromApi', () => Promise.resolve())
      )

      return handleUser(testUserID).should.eventually.deep.equal({
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: testRequests
      })
    })

    it('should call sendUserToQueue if CacheUser#get resolves with undefined', () => {
      const testUserID = `test_user_${uuid()}`

      const getStub = sandbox.stub()
      getStub.resolves()
      const sendUserToQueueStub = sandbox.stub()
      sendUserToQueueStub.resolves()

      wires.push(
        userPathHandler.__set__('CacheUser', { get: getStub }),
        userPathHandler.__set__('sendUserToQueue', sendUserToQueueStub),
        userPathHandler.__set__('getUserFromApi', () => Promise.resolve())
      )

      return handleUser(testUserID).then(() => {
        sendUserToQueueStub.should.have.been.calledWith(testUserID)
      })
    })

    it('should resolve with the result of getUserFromApi if CacheUser#get resolves with undefined', () => {
      const testUserID = `test_user_${uuid()}`
      const testLoans = [uuid(), uuid()]
      const testRequests = [uuid(), uuid(), uuid()]

      const getStub = sandbox.stub()
      getStub.resolves()
      const getUserFromApiStub = sandbox.stub()
      getUserFromApiStub.resolves({
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: testRequests
      })

      wires.push(
        userPathHandler.__set__('CacheUser', { get: getStub }),
        userPathHandler.__set__('sendUserToQueue', () => Promise.resolve()),
        userPathHandler.__set__('getUserFromApi', getUserFromApiStub)
      )

      return handleUser(testUserID).should.eventually.deep.equal({
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: testRequests
      })
    })

    it('should resolve with the result of getUserFromApi if CacheUser#get rejects', () => {
      const testUserID = `test_user_${uuid()}`
      const testLoans = [uuid(), uuid()]
      const testRequests = [uuid(), uuid(), uuid()]

      const getStub = sandbox.stub()
      getStub.rejects()
      const getUserFromApiStub = sandbox.stub()
      getUserFromApiStub.resolves({
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: testRequests
      })

      wires.push(
        userPathHandler.__set__('CacheUser', { get: getStub }),
        userPathHandler.__set__('sendUserToQueue', () => Promise.resolve()),
        userPathHandler.__set__('getUserFromApi', getUserFromApiStub)
      )

      return handleUser(testUserID).should.eventually.deep.equal({
        primary_id: testUserID,
        loan_ids: testLoans,
        request_ids: testRequests
      })
    })
  })

  describe('getUserFromApi method tests', () => {
    const getUserFromApi = userPathHandler.__get__('getUserFromApi')

    before(() => {
      process.env.ALMA_KEY = 'key'
    })

    after(() => {
      delete process.env.ALMA_KEY
    })

    it('should call almaApi.users#get', () => {
      const testUserID = `test_user_${uuid()}`

      const getStub = sandbox.stub(AlmaUser, 'get')
      getStub.resolves({ data: {} })

      return getUserFromApi(testUserID)
        .then(() => {
          getStub.should.have.been.calledWith(testUserID)
        })
    })

    it('should return the user data from the response', () => {
      const testUserID = `test_user_${uuid()}`
      const testLoans = [uuid(), uuid()]
      const testRequests = [uuid(), uuid(), uuid()]
      const testResponse = {
        primary_id: testUserID,
        loans: testLoans,
        requests: testRequests
      }

      const getStub = sandbox.stub(AlmaUser, 'get')
      getStub.resolves({ data: testResponse })

      return getUserFromApi(testUserID).should.eventually.deep.equal(testResponse)
    })
  })

  describe('sendUserToQueue method tests', () => {
    const sendUserToQueue = userPathHandler.__get__('sendUserToQueue')

    it('should call Queue#sendMessage with the user ID', () => {
      const testUserID = `test_user_${uuid()}`

      const sendMessageStub = sandbox.stub(Queue.prototype, 'sendMessage')
      sendMessageStub.resolves()

      return sendUserToQueue(testUserID)
        .then(() => {
          sendMessageStub.should.have.been.calledWith(testUserID)
        })
    })
  })
})
