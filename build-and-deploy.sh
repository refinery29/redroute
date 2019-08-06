#!/bin/sh

[ "${debug:-}" = 'true' ] && set -x
set -e

# From the package provided as an argument, which has been installed into the node_modules directory,
# recursively get it's dependencies, and their dependencies, and so on, printing the name of each package.
enumerate_package_dependencies () {
    for package in $(jq -r '.dependencies|keys[]' "node_modules/$1/package.json" 2>/dev/null)
    do
        enumerate_package_dependencies "$package"
    done
    echo "$1"
}

FUNCTION_PREFIX="${1:-}"
FUNCTION_SUFFIX='-redroute'
FUNCTION_NAME="${REDROUTE_FUNCTION_NAME:-${FUNCTION_PREFIX}${FUNCTION_SUFFIX}}"

if [ "$FUNCTION_NAME" = "$FUNCTION_SUFFIX" ]
then
    echo 'To enable deploys, a single positional argument, the function prefix, or a REDROUTE_FUNCTION_NAME may be provided as an env var.' >&2
    DEPLOY=false
fi

ZIPFILE="${TMPDIR:-/tmp/}lambda-function-package-$(date +%s).zip"

npm ci >&2
npm run lint >&2

zip "$ZIPFILE" index.js >&2

for top_level_dependency in $(jq -r '.dependencies| keys[]' package.json)
do
    for package in $(enumerate_package_dependencies "$top_level_dependency")
    do
        zip -r "$ZIPFILE" "node_modules/$package" >&2
    done
done

if ! [ "$DEPLOY" = 'false' ] && aws lambda list-functions | jq -r '.Functions[]|.FunctionName' | grep "$FUNCTION_NAME" >/dev/null
then
    aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://${ZIPFILE}" >&2
else
    echo 'The specified Lambda function does not exist. You may create it using the create-function.sh script in this repository, providing the following file path:' >&2
    echo "$ZIPFILE"
fi
