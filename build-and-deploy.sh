#!/bin/sh
#npm ci
enumerate_package_dependencies () {
    for package in $(jq -r '.dependencies|keys[]' node_modules/$1/package.json 2>/dev/null)
    do
        enumerate_package_dependencies "$package"
    done
    echo "$1"
}
zip lambda-function-package.zip index.js

for package in $(enumerate_package_dependencies $(jq -r '.dependencies| keys[]' package.json))
do
    zip -r lambda-function-package.zip node_modules/$package
done

aws lambda update-function-code --function-name redroute --zip-file fileb://lambda-function-package.zip
