# LAG-api-gateway
A serverless application on AWS Lambda to provide an API for Alma, using data cached in DynamoDB

This service is built on the [serverless](https://serverless.com/) framework.

The service is intended to respond to HTTP API calls through the AWS API Gateway. It is intended to read data from a cache of Alma in DynamoDB, and default to using the existing Alma API where no data is available in the cache.

The service consists of seven AWS Lambda functions, `get-user`, `get-user-loan`, `get-user-loans`, `get-user-request`, `get-user-requests`, `get-user-fee` and `get-user-fees`. All Lambdas are invoked through the Lambda proxy API gateway integration for a specific endpoint on the API. All Lambdas will also pass the user ID of a requested item to the users Queue if the specified user is not available in the cache.

### get-user
This handles the endpoint `GET /users/<userID>`. It will return a complete list of all of the user's loans, requests and fees. It will attempt to resolve the list of these IDs from the cache, and default to Alma where the cache returns no user record. It will then attempt to resolve all individual loans, requests and fees from the cache, again defaulting to Alma where this data is not available in the cache.

### get-user-loans
Handles the endpoint `GET /users/<userID>/loans`. It will return a complete list of all of the user's loans, following the same process as `get-user` to resolve this data.

### get-user-loan
Handles the endpoint `GET /users/<userID>/loans/<loanID>`. It will return a complete single loan record, either from cached data if available, or Alma if not.

### get-user-requests
Handles the endpoint `GET /users/<userID>/requests`. It will return a complete list of all of the user's requests, following the same process as `get-user` to resolve this data.

### get-user-request
Handles the endpoint `GET /users/<userID>/requests/<requestID>`. It will return a complete single requests record, either from cached data if available, or Alma if not.

### get-user-fees
Handles the endpoint `GET /users/<userID>/fees`. It will return a complete list of all of the user's fees, following the same process as `get-user` to resolve this data.

### get-user-fee
Handles the endpoint `GET /users/<userID>/fees/<feeID>`. It will return a complete single fees record, either from cached data if available, or Alma if not.

## Usage

The service can be deployed using the command
`sls deploy --stage <STAGE> --region <REGION>`

There are two valid stages defined in the `serverless.yml` configuration file. These are `stg` and `prod`. Environment variables for the SQS Users queue URL and ARN, and the User, Loan, Request and Fee DynamoDB table names should be set for the chosen stage. The name of the Alma API key SSM parameter should also be provided. The full set of environment variable names is:

Resource | Staging | Production
--- | --- | ---
User Queue URL | `USER_QUEUE_URL_STG` | `USER_QUEUE_URL_PROD`
User Queue ARN | `USER_QUEUE_ARN_STG` | `USER_QUEUE_ARN_PROD`
User Table Name | `USER_CACHE_TABLE_NAME_STG` | `USER_CACHE_TABLE_NAME_PROD`
Loan Table Name | `LOAN_CACHE_TABLE_NAME_STG` | `LOAN_CACHE_TABLE_NAME_PROD`
Request Table Name | `REQUEST_CACHE_TABLE_NAME_STG` | `REQUEST_CACHE_TABLE_NAME_PROD`
Request Table Name | `FEE_CACHE_TABLE_NAME_STG` | `FEE_CACHE_TABLE_NAME_PROD`
Alma API Key Name | `ALMA_API_KEY_NAME` | `ALMA_API_KEY_NAME`

Deploying the service will create the seven Lambdas. This service creates no other resources.

## Associated Services

There are four services that make up the Alma caching stack. These are:

- [alma-webhook-handler](https://github.com/lulibrary/alma-webhook-handler)       -   passes Alma webhook data to SNS topics :
- [LAG-sns-update-cache](https://github.com/lulibrary/LAG-sns-update-cache)       -   writes webhook data from SNS topics to  DynanoDB
- [LAG-bulk-update-cache](https://github.com/lulibrary/LAG-bulk-update-cache)     -   updates DynamoDB with data from Alma API for queued records
- [LAG-api-gateway](https://github.com/lulibrary/LAG-api-gateway)                 -   provides a REST API for cached Alma data with fallback to Alma API

There are also 3 custom packages on which these depend. These are:
- [LAG-Utils](https://github.com/lulibrary/LAG-Utils)                             -   utility library for AWS services
- [LAG-Alma-Utils](https://github.com/lulibrary/LAG-Alma-Utils)                   -   utility library for DynamoDB cache schemas
- [node-alma-api-wrapper](https://github.com/lulibrary/node-alma-api-wrapper)     -   utility library for querying Alma API


## Development
Contributions to this service or any of the associated services and packages are welcome.
