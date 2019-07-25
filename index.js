const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redis = require('redis');

exports.handler = (event, context, callback) => {
  const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort
  });

  const commands = {
    'hset': (key, field, value) => {
      redisClient.hset(key, field, value, (err) => {
        if (err) {
          throw err;
        } else {
          // Query for new key to confirm its creation, we may not need this
          redisClient.hget(key, field, (err, value) => {
            if (err) {
              throw err;
            } else {
              console.log('HSET ' + key + ' ' + field + ' ' + value);
            }
          });
        }
      });
    },
    'hdel': (key, field) => {
      redisClient.hdel(key, field, (err) => {
        if (err) {
          throw err;
        } else {
          // Query for deleted key to confirm its deletion, we may not need this
          redisClient.hget(key, field, (err, value) => {
            if (err) {
              throw err;
            } else if (value !== null) {
              throw new Error('Key failed to delete, value was ' + value);
            } else {
              console.log('HDEL ' + key + ' ' + field);
            }
          });
        }
      });
    }
  };

  console.log('Processing ' + event.Records.length + ' records');
  redisClient.on('error', (err) => {
    console.log('Redis Client Error: ' + err);
  });

  for (i = 0; i < event.Records.length; i++) {
    const body = JSON.parse(event.Records[i].body);
    const command = body.command;
    const key = body.key;
    const field = body.field;
    const value = body.value;

    console.log('processing command: ' + command +
                  '\nkey: ' + key +
                  '\nfield: ' + field +
                  '\nvalue: ' + value);

    try {
      // Call delegator function which can handle these early redis commands which share argument order.
      commands[command](key, field, value);
    } catch (err) {
      if (err instanceof TypeError) {
        console.log('Command ' + command + ' not yet implemented');
      } else {
        console.log('Unknown error: ' + err.message);
      }
    }

    // Ack for record would go here on fifo.
    console.log('finished with ' + command +
                ' ' + key +
                ' ' + field +
                ' ' + value);
  }

  // Signal completion of function execution.
  return callback();
};
