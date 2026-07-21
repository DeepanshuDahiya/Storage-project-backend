import cron from "node-cron";
import Files from "../Models/file.model.js";
import s3Client from "../Config/s3.js";
import { deleteFilesFromS3 } from "../Services/s3.service.js";

cron.schedule("0 * * * *", async () => {
  console.log("Running upload cleanup...");

  const uploadExpirationTime = new Date(Date.now() - 30 * 60 * 1000);

  const uploads = await Files.find({
    status: "upload_pending",
    createdAt: { $lt: uploadExpirationTime },
  });

  const keys = uploads.map((file) => file.key);
  const ids = uploads.map((file) => file._id);

  try {
    await deleteFilesFromS3(keys);

    await Files.deleteMany({
      _id: { $in: ids },
    });
  } catch (err) {
    console.error(err);
  }
});
