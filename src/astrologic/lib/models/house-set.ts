
export class HouseSet {
  jd:number = 0;
  houses:Array<number> = [];
  ascendant:number = 0;
  mc:number = 0;
  armc:number = 0;
  vertex:number = 0;
  equatorialAscendant:number = 0;
  kochCoAscendant:number = 0;
  munkaseyCoAscendant:number = 0;
  munkaseyPolarAscendant:number = 0;

  constructor(houseData:any = null) {
    if (houseData instanceof Object) {
      Object.entries(houseData).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'house':
          case 'houses':
            if (value instanceof Array) {
              this.houses = value;
            }
            break;
          default:
            this[key] = value;
            break;
        }
      })
    }
  }

  count = () => this.houses.length;

  rangeByNum(num) {
    if (num > 0 && num <= this.houses.length) {
      const index = num - 1;
      const nextIndex = num % this.houses.length;
      return [this.houses[index], this.houses[nextIndex]]
    } else {
      return [0, 0];
    }
  }

  start(num) {
    return this.rangeByNum(num)[0];
  }

  end(num) {
    return this.rangeByNum(num)[1];
  }

}
