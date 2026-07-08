import IORedis from "ioredis";

const bullmqConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

export default bullmqConnection;
