/* eslint no-console: 0 */
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redis = require('redis');

exports.handler = (event, context, callback) => {
  const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort,
  });

  redisClient.on('error', (err) => {
    redisClient.quit();
    callback(new Error(err));
  });

  const commands = {
    'hset': (key, field, value) => {
      redisClient.hset(key, field, value, (err) => {
        if (err) {
          redisClient.quit();
          callback(new Error(err));
        }

        // Query for new key to confirm its creation, we may not need this
        redisClient.hget(key, field, (err, value) => {
          if (err) {
            redisClient.quit();
            callback(new Error(err));
          }

          redisClient.quit();
          callback(null, 'HSET SUCCESS ' + key + ' ' + field + ' ' + value);
        });
      });
    },
    'hdel': (key, field) => {
      redisClient.hdel(key, field, (err) => {
        if (err) {
          redisClient.quit();
          callback(Error(err));
        }

        // Query for deleted key to confirm its deletion, we may not need this
        redisClient.hget(key, field, (err, value) => {
          if (err) {
            redisClient.quit();
            callback(new Error(err));
          } else if (value !== null) {
            redisClient.quit();
            callback(new Error('Key failed to delete, value was ' + value));
          }

          redisClient.quit();
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

      console.log('Processing command: ', command);
      console.log('Key: ', key);
      console.log('Field: ', field);
      console.log('Value: ', value);

      // Call delegator function which can handle these early redis commands which share argument order.
      commands[command](key, field, value);
    } catch (err) {
      if (err instanceof TypeError) {
        redisClient.quit();
        callback(Error('Command Not Found'));
      } else {
        redisClient.quit();
        callback(Error('Unknown error: ' + err.message));
      }
    }
  });
};
