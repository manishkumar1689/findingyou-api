import upagrahaData from '../settings/upagraha-data';
import { subtractLng360 } from '../helpers';
import { isNumeric } from './../../../lib/validators';

export class UpagrahaValue {
  num = 0;
  key = '';
  body = '';
  position = 0;
  value = 0;
  sort = 0;

  constructor(inData: any, ayanamsha = 0) {
    if (inData instanceof Object) {
      const { key, value } = inData;
      if (key && isNumeric(value)) {
        const row = upagrahaData.refs.find(ug => ug.key === key);
        if (row) {
          this.num = row.num;
          this.key = key;
          this.value = subtractLng360(value, ayanamsha);
          this.position = row.position;
          this.body = row.body;
          this.sort = row.sort;
        }
      }
    }
  }
}
