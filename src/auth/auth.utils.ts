import { fromBase64 } from '../lib/hash';
import { globalApikey, suffixSplitChars } from '../.config';

interface ValidAuthToken {
  valid: boolean;
  uid: string;
}

const base36PartsToHexDec = (str: string): string => {
  return str
    .split('_')
    .map(p => parseInt(p, 36).toString(16))
    .join('');
};

const randomCharsRegex = (chars: string[]) => {
  return new RegExp('[' + chars + ']');
};

const randomCharsSplit = (str: string, chars: string[]) => {
  return str.split(randomCharsRegex(chars));
};

export const fromDynamicKey = (
  str: string,
  checkUid = false,
  minutes = 1440,
): ValidAuthToken => {
  let matches = false;
  const decrypted = fromBase64(str);

  const firstChar = decrypted.substring(0, 1);
  let uid = '';
  let valid = false;
  if (/^[0-9a-z]$/i.test(firstChar)) {
    const offset = (parseInt(firstChar, 36) % 6) + 2;
    const apiKeyIndex = decrypted.indexOf(globalApikey);
    if (apiKeyIndex === offset) {
      const parts = decrypted.split('__');
      // check userId if required
      if (checkUid && parts.length > 1) {
        uid = parts.pop();
        valid = false;
        const subParts = randomCharsSplit(uid, suffixSplitChars);
        if (subParts.length > 1) {
          const randIntStr = subParts.pop();
          const randInt = parseInt(randIntStr, 36);
          const uid36 = subParts.shift();
          uid = base36PartsToHexDec(uid36);
          valid = !isNaN(randInt);
        }
      }
      const baseStr = parts.join('__');
      const tsParts = baseStr.split(globalApikey);
      const [tsStr, baseSuffix] = randomCharsSplit(
        tsParts.join(''),
        suffixSplitChars,
      );
      if (valid && /^[0-9a-z]+$/i.test(tsStr)) {
        const suffixInt = parseInt(tsStr, 36);
        if (!isNaN(suffixInt)) {
          const ts = parseInt(
            tsStr
              .split('')
              .reverse()
              .join(''),
            36,
          );
          const currTs = new Date().getTime();
          const msTolerance = minutes * 60 * 1000;
          const [min, max] = [currTs - msTolerance, currTs + msTolerance];
          matches = ts >= min && ts <= max;
          if (matches && checkUid) {
            valid = uid.length > 20;
          }
        }
      }
    }
  }
  return { valid, uid };
};
