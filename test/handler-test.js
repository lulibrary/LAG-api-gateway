const chai = require('chai')
chai.should()

// Module under test
const handler = require('../src/handler')

describe('API gateway tests', () => {
  it('should export a function', () => {
    handler.handle.should.be.a('function')
  })
})
