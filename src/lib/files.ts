import * as fs from 'fs';
import * as path from 'path';
import {
  validMediaFileExtensions,
  exportDirectory,
  filesDirectory,
  backupPath,
} from '../.config';
import { hashMapToObject } from './entities';
import { imageSize } from 'image-size';
import { notEmptyString } from './validators';
import { isObject } from 'util';

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

export const writeExportFile = (filename: string, data, folder = 'exports') => {
  const fp = buildFullPath(filename, folder);
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
  }
  return deleted;
};

export const mediaPath = (type: string = 'media') => {
  let relPath = 'media';
  switch (type) {
    case 'export':
    case 'exports':
      relPath = exportDirectory;
      break;
    case 'backup':
    case 'backups':
      relPath = backupPath;
      break;
    case 'files':
      relPath = filesDirectory;
      break;
  }
  return path.resolve(relPath) + '/';
};

export const smartParseJsonFromBuffer = buffer => {
  let value = buffer.toString();
  if (value.indexOf('/*') >= 0 && value.indexOf('*/') >= 3) {
    const parts = value.split('/*');
    const validParts = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        const endStr = parts[i].split('*/').pop();
        validParts.push(endStr);
      } else if (parts[i].length > 0) {
        validParts.push(parts[0]);
      }
    }
    value = validParts.join('');
  }
  let obj: any = {};
  let error = null;
  try {
    obj = JSON.parse(value);
  } catch (e) {
    error = e;
  }
  const valid = obj instanceof Object && Object.keys(obj).length > 0;
  const isArray = valid ? obj instanceof Array : false;
  const outerArrayLength = isArray ? obj.length : -1;
  let isArrayOfObjects =
    outerArrayLength > 0 ? obj[0] instanceof Object : false;
  const isArrayOfArrays = isArrayOfObjects ? obj[0] instanceof Array : false;
  if (isArrayOfArrays) {
    isArrayOfObjects = false;
  }
  let keys = [];
  if (isArrayOfObjects && outerArrayLength > 0) {
    keys = Object.keys(obj[0]);
  } else if (valid && !isArray) {
    keys = Object.keys(obj);
  }
  return {
    valid,
    error,
    isArray,
    isArrayOfObjects,
    isArrayOfArrays,
    obj,
  };
};

export const extractJsonData = (
  file,
  key: string,
  mode: string,
): Map<string, any> => {
  const mp = new Map<string, any>();
  mp.set('valid', false);
  if (file instanceof Object) {
    const { originalname, mimetype, size, buffer } = file;
    mp.set('mode', mode);
    mp.set('key', key);
    mp.set('mimetype', mimetype);
    mp.set('size', size);
    mp.set('originalname', originalname);
    const jsonData = smartParseJsonFromBuffer(buffer);
    const specialKeys = ['value', 'error', 'obj'];
    Object.entries(jsonData).forEach(entry => {
      const [k, v] = entry;
      if (specialKeys.includes(k) === false) {
        mp.set(k, v);
      }
    });
    if (jsonData.valid) {
      mp.set('value', jsonData.obj);
      mp.set('valid', jsonData.valid);
    } else {
      mp.set('error', jsonData.error);
    }
  }
  return mp;
};

export const writeSettingFile = (fileName: string, value = null) => {
  writeExportFile(fileName, value);
};

export const buildFullPath = (filename: string, type: string = 'media') => {
  return mediaPath(type) + filename;
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
