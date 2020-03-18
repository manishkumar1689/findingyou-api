import { isNumeric } from '../validators';

export class GeoLoc {

  lat:number = 0;
  lng:number = 0;
  alt:number = 0;

  constructor(geoData) {
    if (geoData instanceof Object) {
      Object.entries(geoData).forEach(entry => {
        const [key, value] = entry;
        let flVal = 0;
        let isNumber = false;
        switch (typeof value) {
          case 'string':
            flVal = parseFloat(value);
            isNumber = isNumeric(value);
            break;
          case 'number':
            flVal = value;
            isNumber = true;
            break;
          default:
            if (value instanceof Number) {
              flVal = parseFloat(value.toString());
              isNumber = true;
            }
            break;
        }
        if (isNumber) {
          switch (key) {
            case 'lat':
            case 'latitude':
              this.lat = flVal;
              break;
            case 'lng':
            case 'longitude':
              this.lng = flVal;
              break;
            case 'alt':
            case 'altitude':
              this.lng = flVal;
              break;
          }
        }
        
      })
    }
  }

  latitude = () => this.lat;

  longitude = () => this.lng;

  altitude = () => this.alt;

}