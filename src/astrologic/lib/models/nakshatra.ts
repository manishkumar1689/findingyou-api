export class Nakshatra {
  index = 0;
  num = 0;
  percent = 0;
  name = "";
  ruler = "";
  goal = "";
  sex = "";
  yoni = "";
  aksharas: Array<string> = [];
  nadi = "";
  degrees = 0;
  within = 0;

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case "aksharas":
            if (v instanceof Array) {
              this.aksharas = v;
            }
            break;
          default:
            this[k] = v;
            break;
        }
      });
    }
  }
}
