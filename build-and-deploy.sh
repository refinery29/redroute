npm ci
zip -r lambda-function-package.zip node_modules index.js
aws lambda update-function-code --function-name redroute --zip-file fileb://lambda-function-package.zip
