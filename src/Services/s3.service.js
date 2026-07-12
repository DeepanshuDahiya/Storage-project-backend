import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../Config/s3.js";

export const createUploadSignedUrl = async ({ key, contentType }) => {
  try {
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
  } catch (error) {
    return error;
  }
};

export const createGetSignedUrl = async ({ key, action, filename }) => {
  try {
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `${action}; filename=${encodeURIComponent(filename)}`,
    });

    const url = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 60 * 5,
    });
    return url;
  } catch (error) {
    return error;
  }
};

export const getFileDetailsFromS3 = async ({ key }) => {
  try {
    const getDetailsCommand = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const fileDetails = await s3Client.send(getDetailsCommand);
    return fileDetails;
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return { err: "Not Found", statusCode: 404 };
    }
    return error;
  }
};

export const deleteFilesFromS3 = async ({ keys }) => {
  try {
    const objects = keys.map((key) => ({ Key: key }));

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: objects,
        Quiet: false,
      },
    });

    const delFiles = await s3Client.send(deleteCommand);
    return delFiles;
  } catch (error) {
    return error;
  }
};
