import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import connectRedis from "./src/config/redis.js";

try {
  await connectDB();
  await connectRedis();
} catch (error) {
  console.log(error);
}

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("Server listening on the port", PORT);
});
