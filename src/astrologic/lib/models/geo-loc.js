
class GeoLoc {

  lat = 0;
  lng = 0;
  alt = 0;

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