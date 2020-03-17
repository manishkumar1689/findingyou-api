
class HouseSet {

  houses = [];
  ascendant = 0;
  mc = 0;
  armc = 0;
  vertex = 0;
  equatorialAscendant = 0;
  kochCoAscendant = 0;
  munkaseyCoAscendant = 0;
  munkaseyPolarAscendant = 0;

  constructor(houseData) {
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

module.exports = { HouseSet };