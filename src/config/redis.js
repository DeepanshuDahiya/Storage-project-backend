import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(time) {
    if (times > 3) {
      return null;
    }
    return 2000;
  },
});

redis.on("ready", () => {
  console.log("Redis is now connected successfully.");
});

redis.on("error", (error) => {
  console.log("Redis error: ", error);
});

export default async function connectRedis() {
  try {
    await redis.connect();
    await redis.ping();
  } catch (error) {
    console.log("Redis error: ", error.message);
    throw error;
  }
}
