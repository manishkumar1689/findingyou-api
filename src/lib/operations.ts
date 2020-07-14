import { spawn } from 'child_process';
import * as fs from 'fs';
import {
  mongo,
  backupPath,
  exportDirectory,
  mediaPath,
  filesDirectory,
} from '../.config';
import { buildFullPath } from './files';

interface FileDetails {
  name: string;
  isDirectory: boolean;
  size: number;
  ctime: Date;
  mtime: Date;
}

interface DirectoryDetails {
  valid: boolean;
  path: string;
  files: FileDetails[];
  size: number;
  numRefs: number;
}

const optionParam = (name: string, value: string) => {
  return '--' + name + '=' + value;
};

const buildOptionParams = (pairs: string[][]): string[] => {
  return pairs
    .filter(pair => pair.length > 1)
    .map(pair => optionParam(pair[0], pair[1]));
};

export const exportCollection = (
  collection: string = '',
  format: string = 'json',
) => {
  const outFile = buildFullPath(collection + '.' + format, 'backups');

  const baseCmd = 'mongoexport';
  const args = buildOptionParams([
    ['db', mongo.name],
    ['username', mongo.user],
    ['password', mongo.pass],
    ['collection', collection],
    ['type', format],
  ]);

  args.push(optionParam('out', outFile));

  spawn(baseCmd, args);
  console.log(baseCmd, args);
  return outFile;
};

export const matchPath = (type: string) => {
  switch (type) {
    case 'media':
      return mediaPath;
    case 'files':
      return filesDirectory;
    case 'exports':
      return exportDirectory;
    default:
      return backupPath;
  }
};

export const listFiles = async (
  directory: string,
): Promise<DirectoryDetails> => {
  const path = matchPath(directory);
  const data = {
    valid: false,
    path,
    files: new Array<FileDetails>(),
    size: 0,
    numRefs: 0,
  };

  if (fs.existsSync(path)) {
    const refs = fs.readdirSync(path);
    if (refs instanceof Array) {
      data.files = [];
      data.numRefs = refs.length;
      for (let i = 0; i < data.numRefs; i++) {
        const fd = await buildFileData(path, refs[i]);
        data.files.push(fd);
      }
    }
    data.valid = data.numRefs > 0;
    data.size = data.files.map(f => f.size).reduce((a, b) => a + b, 0);
  }
  return data;
};

export const checkFileExists = path => {
  return fs.existsSync(path);
};

export const fetchFileInfo = path => {
  const filename = path.split('/').pop();
  const stats = fs.lstatSync(path);
  return {
    name: filename,
    isDirectory: stats.isDirectory(),
    size: stats.size,
    ctime: stats.ctime,
    mtime: stats.mtime,
  };
};

const buildFileData = async (
  path: string,
  filename: string,
): Promise<FileDetails> => {
  const fp = [path, filename].join('/');
  return fetchFileInfo(fp);
};
