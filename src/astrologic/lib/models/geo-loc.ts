
export class GeoLoc {

  lat:number = 0;
  lng:number = 0;
  alt:number = 0;

  constructor(geoData) {
    if (geoData instanceof Object) {
      Object.entries(geoData).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'lat':
          case 'latitude':
            this.lat = parseFloat(value);
            break;
          case 'lng':
          case 'longitude':
            this.lng = parseFloat(value);
            break;
          case 'alt':
          case 'altitude':
            this.lng = parseFloat(value);
            break;
        }
      })
    }
  }

  latitude = () => this.lat;

  longitude = () => this.lng;

  altitude = () => this.alt;

}