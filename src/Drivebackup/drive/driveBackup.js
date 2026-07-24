const crypto = require('crypto');
const { getAccessToken, fetchWithRetry } = require('./driveAuth');

// Helper to make Google Drive API requests
async function driveRequest(path, options = {}) {
  const token = await getAccessToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  const isUpload = path.startsWith('/upload/');
  const baseUrl = isUpload 
    ? 'https://www.googleapis.com/upload/drive/v3'
    : 'https://www.googleapis.com/drive/v3';

  const url = `${baseUrl}${isUpload ? path.replace('/upload', '') : path}`;

  const res = await fetchWithRetry(url, { ...options, headers });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error (${res.status}): ${text}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

// Find a file/folder by appProperties
async function findFileByProperty(key, value) {
  const q = encodeURIComponent(`appProperties has { key='${key}' and value='${value}' } and trashed=false`);
  const data = await driveRequest(`/files?q=${q}&fields=files(id, name, md5Checksum, appProperties)`);
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

// List all files in a parent folder
async function listFilesByParent(parentId) {
  const q = encodeURIComponent(`'${parentId}' in parents and trashed=false`);
  const data = await driveRequest(`/files?q=${q}&fields=files(id, name, md5Checksum, appProperties)&pageSize=1000`);
  return data.files || [];
}

// Create a new folder
async function createFolder(name, parentId = null, properties = {}) {
  const body = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    appProperties: properties
  };
  if (parentId) {
    body.parents = [parentId];
  }

  return driveRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Create file metadata
async function createFileMetadata(name, parentId, properties) {
  const body = {
    name,
    parents: [parentId],
    appProperties: properties
  };
  return driveRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Upload/overwrite file content (JSON or binary)
async function uploadFileContent(fileId, mimeType, buffer) {
  return driveRequest(`/upload/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Content-Type': mimeType
    },
    body: buffer
  });
}

// Delete a file
async function deleteFile(fileId) {
  return driveRequest(`/files/${fileId}`, {
    method: 'DELETE'
  });
}

// Ensure the Focora folder structure exists
async function getOrCreateAppFolders() {
  let rootFolder = await findFileByProperty('type', 'root');
  if (!rootFolder) {
    console.log('focora/driveBackup: Creating root folder Focora...');
    rootFolder = await createFolder('Focora', null, { type: 'root' });
  }

  let imagesFolder = await findFileByProperty('type', 'images-dir');
  if (!imagesFolder) {
    console.log('focora/driveBackup: Creating images folder...');
    imagesFolder = await createFolder('images', rootFolder.id, { type: 'images-dir' });
  }

  return { rootFolderId: rootFolder.id, imagesFolderId: imagesFolder.id };
}

// Step 1: Initialize backup, upload folders.json & pages.json, analyze images
async function triggerBackup(payload, webContents) {
  const { folders, pages, localImages } = payload;
  
  webContents.send('focora:drive-progress', 'Connecting to Google Drive...');
  const { rootFolderId, imagesFolderId } = await getOrCreateAppFolders();

  // 1. Upload folders.json
  webContents.send('focora:drive-progress', 'Uploading folders...');
  let foldersFile = await findFileByProperty('type', 'folders');
  if (!foldersFile) {
    foldersFile = await createFileMetadata('folders.json', rootFolderId, { type: 'folders' });
  }
  const cleanFolders = (folders || []).map(({ _hydrated, ...rest }) => rest);
  const foldersBuffer = Buffer.from(JSON.stringify(cleanFolders, null, 2), 'utf8');
  await uploadFileContent(foldersFile.id, 'application/json', foldersBuffer);

  // 2. Upload pages.json
  webContents.send('focora:drive-progress', 'Uploading pages...');
  let pagesFile = await findFileByProperty('type', 'pages');
  if (!pagesFile) {
    pagesFile = await createFileMetadata('pages.json', rootFolderId, { type: 'pages' });
  }
  const cleanPages = (pages || []).map(({ _hydrated, ...rest }) => rest);
  const pagesBuffer = Buffer.from(JSON.stringify(cleanPages, null, 2), 'utf8');
  await uploadFileContent(pagesFile.id, 'application/json', pagesBuffer);

  // 3. Analyze images
  webContents.send('focora:drive-progress', 'Analyzing images...');
  const driveImages = await listFilesByParent(imagesFolderId);

  // Maps for drive images
  const driveImageMap = new Map(); // imageId -> driveFile
  driveImages.forEach(file => {
    if (file.appProperties && file.appProperties.imageId) {
      driveImageMap.set(file.appProperties.imageId, file);
    }
  });

  const localImageMap = new Map(); // imageId -> localImageMeta
  localImages.forEach(img => {
    localImageMap.set(img.id, img);
  });

  // Calculate deletions
  const toDelete = [];
  driveImages.forEach(file => {
    const imageId = file.appProperties ? file.appProperties.imageId : null;
    if (imageId && !localImageMap.has(imageId)) {
      toDelete.push(file);
    }
  });

  // Process deletions
  if (toDelete.length > 0) {
    webContents.send('focora:drive-progress', `Purging ${toDelete.length} removed images...`);
    for (const file of toDelete) {
      await deleteFile(file.id);
    }
  }

  // Calculate missing or changed image files
  // If the imageId doesn't exist on Drive, we need it.
  const missingImageIds = [];
  localImages.forEach(img => {
    if (!driveImageMap.has(img.id)) {
      missingImageIds.push(img.id);
    }
  });

  return {
    missingImageIds,
    imagesFolderId
  };
}

// Step 2: Upload a chunk of images (payload is array of { id, mimeType, arrayBuffer })
async function uploadImagesChunk(chunk, imagesFolderId, currentCount, totalCount, webContents) {
  for (let i = 0; i < chunk.length; i++) {
    const img = chunk[i];
    const progressIndex = currentCount + i + 1;
    webContents.send('focora:drive-progress', `Syncing images... (${progressIndex}/${totalCount})`);

    // 1. Compute MD5 checksum of the binary data
    const buffer = Buffer.from(img.arrayBuffer);
    const localMd5 = crypto.createHash('md5').update(buffer).digest('hex');

    // 2. Check if a file with this imageId exists (e.g. if we had a partial failure earlier)
    const existingFile = await findFileByProperty('imageId', img.id);

    if (existingFile) {
      // If the MD5 matches Google's md5Checksum, skip upload
      if (existingFile.md5Checksum === localMd5) {
        console.log(`focora/driveBackup: Image ${img.id} checksum matches, skipping upload.`);
        continue;
      }
      // Otherwise, overwrite it
      await uploadFileContent(existingFile.id, img.mimeType, buffer);
    } else {
      // Create new file metadata
      const extension = img.mimeType.split('/')[1] || 'png';
      const name = `${img.id}.${extension}`;
      const newFile = await createFileMetadata(name, imagesFolderId, {
        type: 'image',
        imageId: img.id
      });
      await uploadFileContent(newFile.id, img.mimeType, buffer);
    }
  }
}

// Download the complete backup from Google Drive
async function triggerRestore(webContents) {
  webContents.send('focora:drive-progress', 'Locating backup files...');
  const { rootFolderId, imagesFolderId } = await getOrCreateAppFolders();

  // 1. Fetch folders.json
  const foldersFile = await findFileByProperty('type', 'folders');
  if (!foldersFile) {
    throw new Error('Backup data (folders.json) not found on Google Drive.');
  }
  webContents.send('focora:drive-progress', 'Downloading folders...');
  const foldersToken = await getAccessToken();
  const foldersRes = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${foldersFile.id}?alt=media`, {
    headers: { 'Authorization': `Bearer ${foldersToken}` }
  });
  const folders = await foldersRes.json();

  // 2. Fetch pages.json
  const pagesFile = await findFileByProperty('type', 'pages');
  if (!pagesFile) {
    throw new Error('Backup data (pages.json) not found on Google Drive.');
  }
  webContents.send('focora:drive-progress', 'Downloading pages...');
  const pagesToken = await getAccessToken();
  const pagesRes = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${pagesFile.id}?alt=media`, {
    headers: { 'Authorization': `Bearer ${pagesToken}` }
  });
  const pages = await pagesRes.json();

  // 3. Fetch images list and download contents
  webContents.send('focora:drive-progress', 'Listing backup images...');
  const driveImages = await listFilesByParent(imagesFolderId);
  const images = [];

  const imagesToken = await getAccessToken();
  for (let i = 0; i < driveImages.length; i++) {
    const file = driveImages[i];
    const imageId = file.appProperties ? file.appProperties.imageId : null;
    if (!imageId) continue;

    webContents.send('focora:drive-progress', `Downloading images... (${i + 1}/${driveImages.length})`);
    
    const res = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { 'Authorization': `Bearer ${imagesToken}` }
    });
    const arrayBuffer = await res.arrayBuffer();

    // Map MIME type
    let mimeType = 'image/png';
    if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (file.name.endsWith('.webp')) {
      mimeType = 'image/webp';
    } else if (file.name.endsWith('.svg')) {
      mimeType = 'image/svg+xml';
    } else if (file.name.endsWith('.gif')) {
      mimeType = 'image/gif';
    }

    images.push({
      id: imageId,
      mimeType,
      arrayBuffer
    });
  }

  webContents.send('focora:drive-progress', 'Restore downloads complete.');
  const cleanFolders = (folders || []).map(({ _hydrated, ...rest }) => rest);
  const cleanPages = (pages || []).map(({ _hydrated, ...rest }) => rest);
  return {
    folders: cleanFolders,
    pages: cleanPages,
    images
  };
}

module.exports = {
  triggerBackup,
  uploadImagesChunk,
  triggerRestore
};
