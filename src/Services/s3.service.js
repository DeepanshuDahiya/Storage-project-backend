import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../Config/s3.js";

export const createUploadSignedUrl = async ({ key, contentType }) => {
  const uploadCommand = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, uploadCommand, {
    expiresIn: 60 * 5,
    signableHeaders: new Set(["content-type"]),
  });
  return url;
};

export const createGetSignedUrl = async ({ key, action, filename }) => {
  const getCommand = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ResponseContentDisposition: `${action}; filename=${encodeURIComponent(filename)}`,
  });

  const url = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 60 * 5,
  });
  return url;
};

export const getFileDetails = async ({ key }) => {
  const getDetailsCommand = new HeadObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  const fileDetails = await s3Client.send(getDetailsCommand);
  return fileDetails;
};

export const deleteFileFromS3 = async ({ key }) => {
  const deleteCommand = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  const delFile = await s3Client.send(deleteCommand);
  return delFile;
};
