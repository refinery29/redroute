const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redis = require('redis');
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
          } else if (value !== nil) {
            throw new Error('Key failed to delete');
          } else {
            console.log('HDEL ' + key + ' ' + field);
          }
        });
      }
    });
  }
};

exports.handler = async(event, context) => {
  for (i = 0; i < event.Records.length; i++) {
    const record = event.Records[i];
    console.log(record);
    const body = JSON.parse(record.body);
    const command = body.command;
    const key = body.key;
    const field = body.field;
    value = body.value;

    console.log('command: ' + command +
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
      // Continue processing records even when one produces an error so we do not lose any.
      continue;
    }

    // Ack for record would go here on fifo.
  }
  return context.logStreamName;
};
