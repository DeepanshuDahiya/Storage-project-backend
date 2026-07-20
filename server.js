import app from "./src/app.js";
import connectDB from "./src/Config/db.js";
import connectRedis from "./src/Config/redis.js";

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
// comment to push to explore working of aws ec2
