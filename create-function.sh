#!/bin/sh

[ "${debug:-}" = 'true' ] && set -x
set -e

FUNCTION_PACKAGE="${1}"
shift
PREFIX="${1}"

SUFFIX='-redroute'
FUNCTION_NAME="${REDROUTE_FUNCTION_NAME:-${PREFIX}${SUFFIX}}"
REDIS_PORT="${REDROUTE_REDIS_PORT:-6379}"
REDIS_HOST="${REDROUTE_REDIS_HOST}"
SUBNET_IDS="${REDROUTE_SUBNET_IDS:-subnet-08851990a6dba2b82,subnet-0b725fe73adf85de4}"
SECURITY_GROUP_IDS="${REDROUTE_SECURITY_GROUP_IDS:-sg-0664e80b833f6585d}"
ROLE="${REDROUTE_ROLE:-arn:aws:iam::327361568963:role/lambda-sqs}"

if [ "$REDIS_HOST" = '' ]
then
    echo 'A target REDIS_HOST must be provided as an env var.' >&2
    INITIALIZATION_FAILURE=true
fi

if [ "$FUNCTION_NAME" = "$SUFFIX" ]
then
    echo 'The function prefix must be provided as a second positional argument or a REDROUTE_FUNCTION_NAME may be provided as an env var.' >&2
    INITIALIZATION_FAILURE=true
fi

[ "$INITIALIZATION_FAILURE" = 'true' ] && exit 2

CREATE_FUNCTION="$(aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs10.x \
    --handler index.handler \
    --timeout 7 \
    --vpc-config="SubnetIds=${SUBNET_IDS},SecurityGroupIds=${SECURITY_GROUP_IDS}" \
    --environment="Variables={REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT}" \
    --tracing-config=Mode=PassThrough \
    --zip-file "fileb://$FUNCTION_PACKAGE" \
    --role "$ROLE" \
    | tee /dev/stderr)"

CREATE_QUEUE="$(aws sqs create-queue --queue-name "$FUNCTION_NAME" | tee /dev/stderr)"

FUNCTION_ARN="$(echo "$CREATE_FUNCTION" | jq -r '.FunctionArn')"
QUEUE_URL="$(echo "$CREATE_QUEUE" | jq -r '.QueueUrl')"
QUEUE_ARN="$(aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn | jq -r '.Attributes.QueueArn')"

aws lambda create-event-source-mapping --event-source-arn "$QUEUE_ARN" --function-name "$FUNCTION_ARN"


