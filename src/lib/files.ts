import * as fs from 'fs';
import * as path from 'path';
import {
  validMediaFileExtensions,
  imageSizes,
  pdfDirectory,
  exportDirectory,
  filesDirectory,
} from '../.config';
import { resizeImage, buildThumbPath, rotateImage } from './resize';
import { hashMapToObject } from './entities';
import { imageSize } from 'image-size';
import { notEmptyString } from './utils';

export const mimeFileFilter = (req, file, callback) => {
  const ext = path.extname(file.originalname);
  const extensions = validMediaFileExtensions;
  const rgx = new RegExp('(' + extensions.join('|') + ')$', '');
  if (!rgx.test(ext)) {
    req.fileValidationError = 'Invalid file type';
    return callback(new Error('Invalid file type'), false);
  }
  return callback(null, true);
};

export interface FileData {
  path: string;
  modified: string;
  size: number;
}

export const uploadMediaFile = (
  workID: string,
  originalname: string,
  data: any,
  imageType = 'media',
) => {
  const filename = generateFileName(workID, originalname);
  const extension = filename
    .split('.')
    .pop()
    .toLowerCase();
  const attrsMap = new Map<string, any>();
  const fullPath = buildFullPath(filename);
  writeMediaFile(filename, data);
  let exists = false;
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      exists = fs.existsSync(fullPath);
      if (exists) {
        const dims = imageSize(fs.readFileSync(fullPath));
        if (dims instanceof Object) {
          Object.entries(dims).forEach(entry => {
            attrsMap.set(entry[0], entry[1]);
          });
        }
      } else {
        attrsMap.set('exists', 0);
      }
      break;
  }
  switch (extension) {
    case 'jpg':
    case 'png':
      resizeImage(fullPath, imageSizes.thumb);
      switch (imageType) {
        case 'statement':
          setTimeout(() => {
            resizeImage(fullPath, imageSizes.half);
          }, 500);
          break;
          case 'featured':
            setTimeout(() => {
              resizeImage(fullPath, imageSizes.featured);
            }, 500);
            break;
        default:
          setTimeout(() => {
            resizeImage(fullPath, imageSizes.large);
          }, 750);
      }
      break;
  }
  return {
    filename,
    attributes: hashMapToObject(attrsMap),
    exists,
  };
};

export const generateFileName = (workID: string, originalname: string) => {
  let extension = originalname
    .split('.')
    .pop()
    .toLowerCase();
  switch (extension) {
    case 'jpeg':
      extension = 'jpg';
      break;
  }
  let filename = '';
  if (workID.indexOf('-') > 6) {
    filename = workID + '.' + extension;
  } else {
    let ts = new Date().getTime() % 1000000;
    filename = buildFileName(workID, ts, extension);
    if (mediaFileExists(filename)) {
      ts = new Date().getTime() % 999888;
      filename = filename = buildFileName(workID, ts, extension);
    }
  }
  return filename;
};

export const generateImageStyle = (filename: string, params = null) => {
  if (notEmptyString(filename) && params instanceof Object) {
    const { mode, width, height } = params;
    if (mode) {
      const parts = filename.split('.');
      const ext = parts.pop();
      return [parts.join('.'), mode, width, height].join('-') + '.' + ext;
    }
  }
  return filename;
};

export const writeMediaFile = (
  filename: string,
  data,
  type: string = 'media',
) => {
  const fp = buildFullPath(filename, type);
  return fs.writeFileSync(fp, data);
};

export const writeExportFile = (filename: string, data) => {
  const fp = buildFullPath(filename, 'exports');
  return fs.writeFileSync(fp, data);
};

export const validFileName = (name: string) => {
  return /^[a-z0-9._-]+\.\w+$/.test(name);
};

export const buildFileName = (
  workID: string,
  ts: number,
  extension: string,
) => {
  return workID + '-' + ts.toString() + '.' + extension;
};

export const mediaFileExists = (filename: string) => {
  return checkFileExists(filename, 'media');
};

export const checkFileExists = (filename: string, type: string = 'media') => {
  const fp = buildFullPath(filename, type);
  return fs.existsSync(fp);
};

export const renameFile = (sourceName: string, newName: string) => {
  const fp = buildFullPath(sourceName, 'files');
  const out = new Map<string, any>();
  if (fs.existsSync(fp)) {
    const np = buildFullPath(newName, 'files');
    if (!fs.existsSync(np)) {
      fs.renameSync(fp, np);
      out.set('valid', true);
      out.set('name', newName);
    } else {
      out.set('valid', false);
      out.set('msg', 'new file name exists: ' + newName);
    }
  } else {
    out.set('valid', false);
    out.set('msg', 'source file does not exist: ' + sourceName);
  }
  return hashMapToObject(out);
};

export const deleteFile = (
  filename: string,
  mime: string,
  directory: string = '',
) => {
  let targetType = 'media';
  if (typeof directory === 'string') {
    targetType = directory;
  }
  let deleted = false;
  const fp = buildFullPath(filename, targetType);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    deleted = true;
    switch (mime) {
      case 'image/jpeg':
      case 'image/png':
        const thumbPath = buildThumbPath(fp, imageSizes.thumb);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
        const largePath = buildThumbPath(fp, imageSizes.large);
        if (fs.existsSync(largePath)) {
          fs.unlinkSync(largePath);
        }
        break;
    }
  }
  return deleted;
};

export const rotateImageFile = (filename: string, degrees: number) => {
  const fp = buildFullPath(filename);

  if (fs.existsSync(fp)) {
    const thumbPath = buildThumbPath(fp, imageSizes.thumb);
    if (fs.existsSync(thumbPath)) {
      rotateImage(thumbPath, degrees);
    }
    setTimeout(() => {
      const largePath = buildThumbPath(fp, imageSizes.large);
      if (fs.existsSync(largePath)) {
        rotateImage(largePath, degrees);
      }
    }, 750);

    setTimeout(() => {
      rotateImage(fp, degrees);
    }, 1500);
  }
};

export const mediaPath = (type: string = 'media') => {
  let relPath = 'media';
  switch (type) {
    case 'pdf':
    case 'pdfs':
      relPath = pdfDirectory;
      break;
    case 'export':
    case 'exports':
      relPath = exportDirectory;
      break;
    case 'files':
      relPath = filesDirectory;
      break;
  }
  return path.resolve(__dirname + '/../../' + relPath) + '/';
};

export const buildFullPath = (filename: string, type: string = 'media') => {
  return mediaPath(type) + filename;
};

export const matchGeneratedPdfPath = (seq: number): FileData => {
  const dirPath = mediaPath('pdf');
  const fn = dirPath + 'application-' + seq + '.pdf';
  return getFileData(fn);
};

export const exportFileData = (filename: string): FileData => {
  const dirPath = mediaPath('exports');
  const fn = dirPath + filename;
  return getFileData(fn);
};

export const getFileData = (fn): FileData => {
  const fp = fs.existsSync(fn) ? fn : '';
  let iSize = 0;
  let modified = '';
  if (fp.length > 0) {
    const { mtime, size } = fs.statSync(fp);
    if (mtime instanceof Date) {
      modified = mtime.toISOString();
    }
    if (size) {
      iSize = size;
    }
  }
  return {
    path: fp,
    modified,
    size: iSize,
  };
};

export const checkNumFiles = (submission, maxFiles: number): boolean => {
  let num = 0;
  if (submission instanceof Object) {
    if (submission.works instanceof Array) {
      num = submission.works
        .map(w => {
          let n = 0;
          if (w instanceof Object) {
            if (w.mediaItems instanceof Array) {
              n = w.mediaItems.length;
            }
          }
          return n;
        })
        .reduce((a, b) => a + b, 0);
    }
  }
  return num < maxFiles;
};
