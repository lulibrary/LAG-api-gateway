const AWS_MOCK = require('aws-sdk-mock')

after(() => {
  AWS_MOCK.restore('DynamoDB')
})
