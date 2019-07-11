# *Red*is *route* creation Lambda function w/consumption from SQS
This Lambda function consumes SQS messages with information necessary to populate Redis with routing information.

## Deployment

### Initial creation
aws lambda create-function --role arn:aws:iam::327361568963:role/lambda-sqs --function-name redroute --runtime nodejs10.x --handler index.handler --publish --environment 'Variables={REDIS_HOST=staging-eks-redis-001.tnuvnk.0001.use1.cache.amazonaws.com}' --zip-file fileb://lambda-function-package.zip
TODO That still requires some stuff with vpc and subnets to be configured.

### Updates

Simply

    zip -r lambda-function-package.zip node_modules index.js
    aws lambda update-function-code --function-name redroute --zip-file fileb://lambda-function-package.zip

or use the [`build-and-deploy.sh`](./build-and-deploy.sh) script, which is more likely to include updates.

## Testing

On macOS:

    aws lambda invoke --payload '{"path": "/foobar", "type": "aggregation"}' \
                      --function-name redroute out \
                      --log-type Tail --query 'LogResult' \
                      --output text \
    | base64 -D

## Development
tk
