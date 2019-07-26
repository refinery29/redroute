#!/bin/sh

[ "$debug" = 'true' ] && set -x
set -e

FUNCTION_SUFFIX="$1"
ZIPFILE="${TMPDIR:-/tmp/}lambda-function-package-$(date +%s).zip"

npm ci
npm run lint

enumerate_package_dependencies () {
    for package in $(jq -r '.dependencies|keys[]' "node_modules/$1/package.json" 2>/dev/null)
    do
        enumerate_package_dependencies "$package"
    done
    echo "$1"
}

zip "$ZIPFILE" index.js

for package in $(enumerate_package_dependencies "$(jq -r '.dependencies| keys[]' package.json)")
do
    zip -r "$ZIPFILE" "node_modules/$package"
done

aws lambda update-function-code --function-name "redroute-${FUNCTION_SUFFIX}" --zip-file "fileb://$ZIPFILE"
