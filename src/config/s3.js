import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const createUploadSignedUrl = async ({ key, contentType }) => {
  const uploadCommand = new PutObjectCommand({
    Bucket: "deep-storage-project",
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, uploadCommand, {
    expiresIn: 60 * 5,
    signableHeaders: new Set(["content-type"]),
  });
  return url;
};
