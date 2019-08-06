#!/bin/sh

[ "$debug" = 'true' ] && set -x
set -e

FUNCTION_SUFFIX="${1:-}"

if ! [ "$FUNCTION_SUFFIX" ]
then
    echo 'A single positional argument, the function suffix, is required.' >&2
    exit 2
fi

ZIPFILE="${TMPDIR:-/tmp/}lambda-function-package-$(date +%s).zip"

npm ci
npm run lint

# From the package provided as an argument, which has been installed into the node_modules directory,
# recursively get it's dependencies, and their dependencies, and so on, printing the name of each package.
enumerate_package_dependencies () {
    for package in $(jq -r '.dependencies|keys[]' "node_modules/$1/package.json" 2>/dev/null)
    do
        enumerate_package_dependencies "$package"
    done
    echo "$1"
}

zip "$ZIPFILE" index.js


for top_level_dependency in $(jq -r '.dependencies| keys[]' package.json)
do
    for package in $(enumerate_package_dependencies "$top_level_dependency")
    do
        zip -r "$ZIPFILE" "node_modules/$package"
    done
done

aws lambda update-function-code --function-name "redroute-${FUNCTION_SUFFIX}" --zip-file "fileb://$ZIPFILE"
