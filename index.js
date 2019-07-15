let redis_host = process.env.REDIS_HOST,
    redis_port = process.env.REDIS_PORT || 6379,
    redis = require('redis'),
    redis_client = redis.createClient({
        host: redis_host,
        port: redis_port,
    }),
    commands = {
        "hset": (key, field, value) => {
            redis_client.hset(key, field, value, (err) => {
                if (err) {
                    throw err;
                } else {
                    // Query for new key to confirm its creation, we may not need this
                    redis_client.hget(key, field, (err, value) => {
                        if (err) {
                            throw err;
                        } else {
                            console.log("HSET " + key + " " + field + " " + value);
                        }
                    });
                }
            });
        },
        "hdel": (key, field) => {
            redis_client.hdel(key, field, (err) => {
                if (err) {
                    throw err;
                } else {
                    // Query for deleted key to confirm its deletion, we may not need this
                    redis_client.hget(key, field, (err, value) => {
                        if (err) {
                            throw err;
                        } else if (value != nil) {
                            throw new Error("Key failed to delete");
                        } else {
                            console.log("HDEL " + key + " " + field);
                        }
                    });
                }
            });
        }
    };

exports.handler = async function (event, context) {
    for (i=0; i < event.Records.length; i++) {
        let record = event.Records[i],
            body = JSON.parse(record.body),
            command = body.command,
            key = body.key,
            field = body.field;
            value = body.value;

        console.log("command: " + command +
                  "\nkey: " + key +
                  "\nfield: " + field +
                  "\nvalue: " + value);

        try {
            // Call delegator function which can handle these early redis commands which share argument order.
            commands[command](key, field, value);
        } catch (err) {
            if (err instanceof TypeError) {
                console.log("Command " + command + " not yet implemented");
            } else {
                console.log("Unknown error: " + err.message);
            }
            // Continue processing records even when one produces an error so we do not lose any.
            continue;
        }

        // Ack for record would go here on fifo.
    }
    return context.logStreamName;
};
