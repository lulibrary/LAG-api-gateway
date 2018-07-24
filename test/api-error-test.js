// Test libraries
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinonChai = require('sinon-chai')
chai.use(chaiAsPromised)
chai.use(sinonChai)
chai.should()
const expect = chai.expect

const sinon = require('sinon')
const sandbox = sinon.createSandbox()

// Module dependencies
const HTTPError = require('node-http-error')

// Module under test
const apiError = require('../src/api-error')

describe('api error tests', () => {
  afterEach(() => {
    sandbox.restore()
  })

  it('should throw a 400 error if the error includes a response', () => {
    expect(() => apiError({ response: 'it went wrong' })).to.throw(HTTPError).with.property('status', 400)
  })

  it('should throw a 500 error if the error does not include a response', () => {
    expect(() => apiError()).to.throw(HTTPError).with.property('status', 500)
  })
})
