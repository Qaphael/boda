const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
  await redis.connect();
  return redis;
};

module.exports = { redis, connectRedis };
