export const geonamesApiBase = 'http://api.geonames.org';

/* const queryGeoNames = async (method, coords, hours = 168) => {
  let data = { valid: false };
  if (coords instanceof Object) {
    const url = apiBase + method;
    const { geonamesUserName } = config;
    const params = { username: geonamesUserName, ...coords };
    const secs = hours * 3600;
    const response = await fetchCachedData(url, params, secs);
    if (response instanceof Object) {
      if (response) {
        const keys = Object.keys(response);
        data = { valid: keys.length > 0, ...response };
      }
    }
  }
  return data;
};

const nearbyPostcodes = async coords => {
  return await queryGeoNames('findNearbyPostalCodesJSON', coords, 168);
};

const extendedGeo = async coords => {
  return await queryGeoNames('extendedFindNearbyJSON', coords, 168 * 13);
};

const nearbyWeather = async coords => {
  return await queryGeoNames('findNearByWeatherJSON', coords, 1);
};

const nearbyPOI = async coords => {
  const params = { style: 'full', ...coords };
  return await queryGeoNames('findNearbyPOIsOSMJSON', params, 168 * 2);
};

const nearbyWikipedia = async coords => {
  const params = { style: 'full', ...coords };
  return await queryGeoNames('findNearbyWikipediaJSON', params, 168);
};

const nearbyAddress = async coords => {
  const params = { style: 'full', ...coords };
  return await queryGeoNames('addressJSON', params, 168);
};

const cleanName = str => {
  let cleaned = str;
  if (typeof str === 'string') {
    cleaned = str
      .toLowerCase()
      .trim()
      .replace(/[,']/g, '')
      .replace(/[^a-z0-9-]/g, '-');
  }
  return cleaned;
};

const nearbyInfo = async (coords, mode = 'uk') => {
  let data = {
    valid: false,
    cached: false,
    hasWeather: false,
    hasPoi: false,
    hasWikiEntries: false,
    hasNearestAddress: false,
    hasPCs: false,
  };
  const placeData = await extendedGeo(coords);
  if (placeData.valid) {
    if (placeData.geonames instanceof Array) {
      data.valid = true;
      data.states = [];
      data.places = [];
      let matchedNames = [];
      let cleanedName = '';
      if (placeData.cached) {
        data.cached = true;
      }
      placeData.geonames.forEach(item => {
        cleanedName = cleanName(item.name);
        switch (item.fcl) {
          case 'A':
            if (matchedNames.indexOf(cleanedName) < 0) {
              data.states.push({
                name: item.name,
                lat: item.lat,
                lng: item.lng,
              });
              matchedNames.push(cleanedName);
            }
            break;
          case 'P':
            if (matchedNames.indexOf(cleanedName) < 0) {
              data.places.push({
                name: item.name,
                lat: item.lat,
                lng: item.lng,
              });
              matchedNames.push(cleanedName);
            }
            break;
        }
      });
    }
    const wd = await nearbyWeather(coords);
    if (wd.valid) {
      if (wd.weatherObservation) {
        if (wd.weatherObservation instanceof Object) {
          let {
            temperature,
            lat,
            lng,
            datetime,
            windSpeed,
            dewPoint,
            humidity,
            stationName,
            cloudsCode,
          } = wd.weatherObservation;
          if (temperature) {
            data.hasWeather = true;
            if (!cloudsCode) {
              cloudsCode = '';
            }
            data.weather = {
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              datetime: new Date(datetime),
              temperature: parseFloat(temperature),
              humidity: parseFloat(humidity),
              windSpeed: parseFloat(windSpeed),
              dewPoint: parseFloat(dewPoint),
              stationName,
              clouds: cloudsCode.toLowerCase(),
            };
          }
        }
      }
    }
    const pd = await nearbyPOI(coords);
    if (pd.valid) {
      if (pd.poi instanceof Array && pd.poi.length > 0) {
        data.hasPoi = true;
        data.poi = pd.poi;
      }
    }
    const ed = await nearbyWikipedia(coords);
    if (ed.valid) {
      if (ed.geonames instanceof Array && ed.geonames.length > 0) {
        data.hasWikiEntries = true;
        data.wikipedia = ed.geonames;
      }
    }

    if (mode !== 'uk') {
      const ad = await nearbyAddress(coords);
      if (ad.valid) {
        data.hasNearestAddress = true;
        data.nearestAddress = ad;
      }

      const pcd = await nearbyPostcodes(coords);
      if (pcd.valid) {
        data.hasPCs = true;
        data.num = 0;
        data.zone = {
          pc: '',
          lat: 0,
          lng: 0,
        };
        data.surrounding = [];
        if (pcd.postalCodes instanceof Array && pcd.postalCodes.length > 0) {
          let c = '';
          let pn = '';
          if (data.states.length > 0) {
            c = data.states[0].name;
          }
          if (data.places.length > 0) {
            pn = data.places[data.places.length - 1].name;
          }
          let cc = 'xx';
          if (pcd.postalCodes.length > 0) {
            if (pcd.postalCodes[0].countryCode) {
              cc = pcd.postalCodes[0].countryCode;
            }
          }
          const pcs = pcd.postalCodes.map(pc => {
            let item = { pc: '', lat: 0, lng: 0, pn, c };
            Object.entries(pc).forEach(et => {
              const [k, v] = et;
              switch (k) {
                case 'postalCode':
                  item.pc = v;
                  break;
                case 'placeName':
                  if (!item.pn) {
                    item.pn = v;
                  }
                  break;
                case 'lat':
                case 'lng':
                  item[k] = parseFloat(v);
                  break;
                case 'placeName':
                  item.d = v;
                  break;
                case 'adminName1':
                  switch (cc) {
                    case 'GB':
                      if (!item.c) {
                        item.c = v;
                      }
                      break;
                    default:
                      item.r = v;
                      break;
                  }
                  break;
                case 'adminName2':
                  item.cy = v;
                  break;
                case 'distance':
                  item.dist = parseFloat(v);
                  break;
              }
            });
            return item;
          });
          data.num = pcs.length;
          data.zone = pcs.shift();
          data.surrounding = pcs;
        }
      }
    }
  }

  return data;
};
 */
