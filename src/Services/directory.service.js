import Directories from "../Models/directory.model.js";

// delete directory Recursive function
export async function collectDeletionData(id, allS3Keys, dirIds, fileIds) {
  const currFolder = await Directories.findById(id).populate(
    "files",
    "_id extension",
  );

  if (!currFolder) return;

  // Collect current directory id
  dirIds.push(currFolder._id);

  // Collect file ids and S3 keys
  if (currFolder.files.length > 0) {
    for (const file of currFolder.files) {
      fileIds.push(file._id);
      allS3Keys.push(`${file._id}${file.extension}`);
    }
  }

  // Visit all child directories recursively
  if (currFolder.directories.length > 0) {
    for (const childId of currFolder.directories) {
      await collectDeletionData(childId, allS3Keys, dirIds, fileIds);
    }
  }
}

export const handleParentDirSize = async (currentDirId, deltaSize, session) => {
  let parent = currentDirId;
  while (parent) {
    const currDir = await Directories.findOneAndUpdate(
      { _id: parent },
      { $inc: { size: deltaSize } },
      {
        session,
      },
    );
    parent = currDir.parentDirId;
  }
  return { success: true };
};
