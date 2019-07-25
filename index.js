const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redis = require('redis');

let redisClient;
const commands = {
  'hset': (key, field, value) => {
    console.log('beginning hset');
    redisClient.hset(key, field, value, (err) => {
      console.log('beginning redisClient.hset callback');
      if (err) {
        console.log('first err');
        throw err;
      } else {
        console.log('no err, confirming');
        // Query for new key to confirm its creation, we may not need this
        redisClient.hget(key, field, (err, value) => {
          console.log('in hget confirmation callback');
          if (err) {
            console.log('err on hget');
            throw err;
          } else {
            console.log('HSET ' + key + ' ' + field + ' ' + value);
          }
        });
      }
    });
    console.log('finishing hset');
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
          } else if (value !== 'nil') {
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
  console.log(event.Records);
  redisClient = redis.createClient({
    host: redisHost,
    port: redisPort
  });
  redisClient.on('error', (err) => {
    console.log('Redis Client Error: ' + err);
  });

  for (i = 0; i < event.Records.length; i++) {
    const body = JSON.parse(event.Records[i].body);
    const command = body.command;
    const key = body.key;
    const field = body.field;
    const value = body.value;

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
    }

    // Ack for record would go here on fifo.
    console.log('finished with ' + command +
                ' ' + key +
                ' ' + field +
                ' ' + value);
  }
  return context.logStreamName;
};
