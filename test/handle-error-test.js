// Test libraries
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinonChai = require('sinon-chai')
chai.use(chaiAsPromised)
chai.use(sinonChai)
chai.should()

const sinon = require('sinon')
const sandbox = sinon.createSandbox()

// Module dependencies
const HTTPError = require('node-http-error')

// Module under test
const handleError = require('../src/handle-error')

describe('handle error tests', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should return the passed error if it is an http error', () => {
    const testError = new HTTPError(404, 'File not found!')

    handleError(testError).should.deep.equal({
      statusCode: 404,
      body: JSON.stringify({
        message: 'File not found!'
      })
    })
  })

  it('should replace the error with a 500 internal server error if it is not an HTTP error', () => {
    const testError = new Error('something went wrong')

    handleError(testError).should.deep.equal({
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error'
      })
    })
  })
})
