const AWS_MOCK = require('aws-sdk-mock')
const sinon = require('sinon')

const stubs = (() => {
  this.describeTableStub = sinon.stub()
  this.getItemStub = sinon.stub()

  AWS_MOCK.mock('DynamoDB', 'describeTable', this.describeTableStub)
  AWS_MOCK.mock('DynamoDB', 'getItem', this.getItemStub)

  return this
})()

module.exports = stubs
