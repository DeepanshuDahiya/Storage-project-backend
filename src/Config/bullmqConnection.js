import IORedis from "ioredis";

const bullmqConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  retryStrategy(tries) {
    if (tries > 3) {
      return null;
    }
    return 2000;
  },
});

export default bullmqConnection;
