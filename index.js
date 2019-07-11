let
    redis_host = process.env.REDIS_HOST,
    redis_port = process.env.REDIS_PORT || 6379,
    redis = require('redis'),
    redis_client = redis.createClient({
        host: redis_host,
        port: redis_port,
    })

exports.handler = async function(event, context) {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2))
    redis_client.set('some-key', 42, (err) => {
        if (err) {
            throw err;
        } else {
            redis_client.get('some-key', (err, value) => {
                if (err) {
                    throw err;
                } else {
                    console.log(value);
                }
            });
        }
    });
    return context.logStreamName
};
