const fs = require('fs');
const path = require('path');
const lineByLine = require('n-readlines');
const config = require('../.config');

/*
@param fn:string
@return Object
*/
const getFileData = (fn) => {
  const path = fs.existsSync(fn) ? fn : '';
  let iSize = 0;
  let modified = '';
  let isDir = false;
  let copyLine = null;
  if (path.length > 0) {
    const stats = fs.statSync(path);
    const { mtime, size } = stats;
    isDir = stats.isDirectory();
    if (mtime instanceof Date) {
      modified = mtime.toISOString();
    }
    if (size) {
      iSize = parseInt(size);
    }
    if (iSize > 32 && !isDir) {
      copyLine = fetchFirstLines(path);
    }
  }
  if (isDir) {
    return { path, isDir };
  } else {
    return {
      path,
      modified,
      size: iSize,
      isDir,
      copyLine
    };
  }
}

/*
@param path:string
@return string
*/
const fetchFirstLines = (path) => {
  let lines = [];
  const liner = new lineByLine(path);
  const yearRgx = /\b(19|20)\d\d\b/;
  let line;
  let lineNumber = 0;
  let strLine = "";
  let yearMatched = false;
  while (line = liner.next()) {
    strLine = line.toString('ascii');
    if (strLine.length > 7) {
      lines.push(strLine);
      if (yearRgx.test(strLine)) {
        yearMatched = true;
        break;
      }
    }
    lineNumber++;
    if (lineNumber > 6) {
      break;
    }
  }
  if (!yearMatched) {
    lines = lines.length > 0 ? lines.splice(0, 1) : [];
  }
  return lines.length > 0 ? lines.join("\n") : null;
}

/*
@param directoryPath:string
@return Array<Object>
*/
const readDataFilesSync = (directoryPath) => {
  let files = [];
  if (fs.existsSync(directoryPath)) {
    files = fs.readdirSync(directoryPath);
  }
  return files.map(fn => {
    const fp = [directoryPath, fn].join('/');
    const fd = getFileData(fp);
    if (fd.isDir) {
      const children = readDataFilesSync(fp);
      return { ...fd, children };
    } else {
      return fd;
    }
  });
}

/*
@param directoryPath:string
@return Promise<Array<Object>>
*/
const readDataFiles = async (directoryPath) => {
  return readDataFilesSync(directoryPath);
}

/*
* return Promise<Array<Object>>
*/
const readEpheFiles = async () => {
  return await readDataFiles(config.ephemerisPath);
}

module.exports = { readEpheFiles };