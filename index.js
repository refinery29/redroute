const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redis = require('redis');

exports.handler = (event, context, callback) => {
  /*
   * Because Redis leaves an open socket, the event loop will always have something in it.
   * Lets not let that get in our way and cause needless timeouts.
   */
  context.callbackWaitsForEmptyEventLoop = false;

  const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort
  });

  redisClient.on('error', (err) => {
    callback(new Error(err));
  });

  const commands = {
    'hset': (key, field, value) => {
      redisClient.hset(key, field, value, (err) => {
        if (err) {
          callback(new Error(err));
        }

        // Query for new key to confirm its creation, we may not need this
        redisClient.hget(key, field, (err, value) => {
          if (err) {
            callback(new Error(err));
          }

          callback(null, 'HSET SUCCESS ' + key + ' ' + field + ' ' + value);
        });
      });
    },
    'hdel': (key, field) => {
      redisClient.hdel(key, field, (err) => {
        if (err) {
          callback(Error(err));
        }

        // Query for deleted key to confirm its deletion, we may not need this
        redisClient.hget(key, field, (err, value) => {
          if (err) {
            callback(new Error(err));
          } else if (value !== null) {
            callback(new Error('Key failed to delete, value was ' + value));
          }

          callback(null, 'HDEL SUCCESS ' + key + ' ' + field);
        });
      });
    }
  };

  console.log('Processing ' + event.Records.length + ' records');

  event.Records.forEach((record) => {
    try {
      const body = JSON.parse(record.body);
      const command = body.command;
      const key = body.key;
      const field = body.field;
      const value = body.value;

      console.log('Processing command: ', command)
      console.log('Key: ', key)
      console.log('Field: ', field)
      console.log('Value: ', value)

      // Call delegator function which can handle these early redis commands which share argument order.
      commands[command](key, field, value);
    } catch (err) {
      if (err instanceof TypeError) {
        callback(Error('Command Not Found'));
      } else {
        callback(Error('Unknown error: ' + err.message));
      }
    }
  });
};
