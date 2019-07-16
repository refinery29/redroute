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

Testing of individual messages can be performed by using the [aws cli client](#AWS%20CLI).

For example, to test `hset`:
```
$ aws sqs send-message --queue-url https://sqs.us-east-1.amazonaws.com/327361568963/staging-redroute --message-body '{
  "command": "hset",
  "key": "some-key",
  "field": "some-field",
  "value": "some-value"
}'
```
will output something like:
```
{
    "MD5OfMessageBody": "cdf1e9fe97ea8e3f9f2d2b483ed7fa7f",
    "MessageId": "03ddfab6-aa93-478f-b0f5-a8b34d55e8e2"
}
```
or `hdel`:
```
$ aws sqs send-message --queue-url https://sqs.us-east-1.amazonaws.com/327361568963/staging-redroute --message-body '{
  "command": "hdel",
  "key": "some-key",
  "field": "some-field"
}'
{
    "MD5OfMessageBody": "33255bd17a76ed2db8b692833a53cd41",
    "MessageId": "3fe208b5-2340-42e6-aae9-d81e10539677"
}
```

To confirm these commands have done anything, you'll need access to the elasticache instance which was configured in the lambda function's environment. Since these are instances should be  locked down to only allow access from within your AWS infrastructure, you could use an appropriately configured ec2 instance or eks container with `redis-cli` installed:
```
$ kubectl -n staging exec -it utility-54fd8467b4-2drgf -- redis-cli -h redis
redis:6379>
```
Then enter the queries directly:
```
redis:6379> hgetall some-key
1) "some-field"
2) "some-value"
redis:6379>
```

## Additional info

#### AWS CLI

On MacOS, this may be installed with `brew install awscli`.

