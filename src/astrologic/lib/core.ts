import * as swisseph from 'swisseph';
import { dmsToDegrees, decDegToDms, degAsDms } from "./converters";
import { simplifyObject } from './mappers';
import { calcAsync, calcUtAsync, riseTransAsync, fixedStarUtAsync, fixedStar2UtAsync, fixstar2MagAsync, getHouses } from './sweph-async';
import { calcJulDate, jdToDateTime } from './date-funcs';
import { calcLagnaSet } from './math-funcs';
import { calcTransition, calcTransitionJd, calcJyotishSunRise, calcSunTrans, matchTransData, fetchIndianTimeData } from './transitions';
import stars from './settings/stars';
import asteroids from './settings/asteroids';
import grahaValues from './settings/graha-values';
import charaKaraka from './settings/chara-karaka';
import nakshatraValues from './settings/nakshatra-values';
import aprakasa from './settings/aprakasa';
import upagrahaData from './settings/upagraha-data';
import tithiValues from './settings/tithi-values';
import yogaValues from './settings/yoga-values';
import karanaData from './settings/karana-data';
import varaValues from './settings/vara-values';
import horaValues from './settings/hora-values';
import caughadiaData from './settings/caughadia-data';
import muhurtaValues from './settings/muhurta-values';
import kalamData from './settings/kalam-data';
import mrityubhagaData from './settings/mrityubhaga-data';
import rashiValues from './settings/rashi-values';
import arudhaValues from './settings/arudha-values';
import sphutaValues from './settings/sphuta-values';
import induValues from './settings/indu-values';
import { GrahaSet, Graha } from './models/graha-set';
import { RashiSet, Rashi } from './models/rashi-set';
import { HouseSet } from './models/house-set';
import { ephemerisPath, ephemerisDefaults } from '../../.config';
import { isNumeric, notEmptyString, validISODateString, inRange } from "./validators";

swisseph.swe_set_ephe_path(ephemerisPath);

// Make user-configurable
swisseph.swe_set_sid_mode(swisseph[ephemerisDefaults.sid_mode], 0, 0);

export const calcUpagrahas = async (datetime, geo, showPeriods = false) => {
	const { jd, startJd, sunData, periodLength, dayBefore, periodHours, isDaytime, weekDay } = await calcJyotishSunRise(datetime, geo);
	const eighthJd = periodLength / 8;
	const eighth = periodHours / 8;
	const periods = showPeriods ? await calcUpagrahaPeriods(startJd, eighthJd, geo) : [];
	const sectionKey = isDaytime ? "daytime" : "nighttime";
	const upaRow = upagrahaData[sectionKey].find(row => row.day === weekDay);
	let values = [];
	for (ref of upagrahaData.refs) {
		const partIndex = upaRow.parts.findIndex(b => b === ref.body);
		const parts = partIndex + 1;
		const value = (partIndex + ref.position) * eighthJd;
		const upaJd = value + startJd;
		const hd = await fetchHouseDataJd(upaJd, geo, 'W');
		values.push({
			...ref, parts, value, jd: upaJd, upagraha: hd.ascendant
		});
	}
	let out = { jd, startJd, ...sunData, periodHours, eighth, weekDay, values, isDaytime };
	if (showPeriods) {
		out.periods = periods;
	}
	return out;
}

export const calcHoras = async (datetime:string, geo) => {
	const { jd, startJd, dayLength, isDaytime, weekDay } = await calcJyotishSunRise(datetime, geo);
	const horaRow = horaValues.find(row => row.day === weekDay);
	const numHoras = horaRow.hora.length;
	const horaLength = dayLength / numHoras;
	const difference = jd - startJd;
	const horaVal = difference / horaLength;
	const horaIndex = Math.floor(horaVal);
	const ruler = horaRow.hora[horaIndex];
	return { jd, horaRow, ruler, index: horaIndex, weekDay, isDaytime };
}

const calcMuhurtaIndex = async (datetime:string, geo) => {
	const { jd, sunData, dayLength, dayBefore } = await calcJyotishSunRise(datetime, geo);
	const { prevRise, rise } = sunData;
	const dayStart = dayBefore ? prevRise.jd : rise.jd;
	const dayProgress = (jd - dayStart) / dayLength;
	const numMuhurtas = muhurtaValues.length;
	const muhurtaLength = dayLength / numMuhurtas;
	const muhurtaVal = dayProgress * numMuhurtas;
	const index = muhurtaVal < numMuhurtas ? Math.floor(muhurtaVal) : (numMuhurtas - 1);
	return { jd, dayStart, index, numMuhurtas, muhurtaLength };
}

const calcMuhurta = async (datetime:string, geo) => {
	const { jd, index } = await calcMuhurtaIndex(datetime, geo);
	const muhurtaRow = muhurtaValues[index];
	return { jd, index, ...muhurtaRow };
}

const calcDayMuhurtas = async (datetime:string, geo) => {
	const { jd, dayStart, index, muhurtaLength } = await calcMuhurtaIndex(datetime, geo);
	const values = muhurtaValues.map((row, ri) => {
		const mJd = dayStart + (ri * muhurtaLength);
		const active = ri === index;
		return { ...row, jd: mJd, dt: jdToDateTime(mJd), active };
	});
	return { jd, values, muhurtaLength, dayStart };
}

const calcUpagrahaPeriods = async (startJd:number, eighthJd:number, geo) => {
	let periods = [];
	for (let i = 0; i < 9; i++) {
		const periodJd = startJd + (i * eighthJd);
		const midPeriodJd = startJd + ((i + 0.5) * eighthJd);
		const hd = await fetchHouseDataJd(periodJd, geo, 'W');
		const hd2 = await fetchHouseDataJd(midPeriodJd, geo, 'W');
		periods.push({
			startJd: periodJd,
			midJd: midPeriodJd,
			dt: jdToDateTime(periodJd),
			ascendant: hd.ascendant,
			midAscendant: hd2.ascendant,
			index: i,
			num: (i + 1)
		});
	}
	return periods;
}

export const calcMrityubhaga = async (datetime:string, geo) => {
	const bodyData = await calcAllBodies(datetime, 'core');
	const { jd, bodies } = bodyData;
	const hd = await fetchHouseDataJd(jd, geo);
	const { ascendant } = hd;
	const { orb, mrityu } = mrityubhagaData;
	const { standard, alternative } = mrityu;
	const standardRange = standard.values.map(row => {
		let lng = null;
		let sign = null;
		let signIndex = -1;
		let signLng = null;
		let active = false;
		switch (row.graha) {
			case 'as':
				lng = ascendant;
				break;
			default:
				const body = bodies.find(b => b.key === row.graha);
				if (body) {
					lng = body.longitude;
				}
				break;
		}
		if (isNumeric(lng)) {
			signIndex = Math.floor(lng / 30);
			sign = signIndex + 1;
			signLng = lng - (signIndex * 30);
			degree = row.degrees[signIndex];
			active = inRange(lng, [(degree - orb), (degree + orb)]);
		}
		return { lng, sign, signLng, degree, active, ...row };
	});
	const altRange = [];
	return { jd, dt: datetime, ascendant, standardRange, altRange, bodies };
}

export const calcAllTransitions = async (datetime:string, geo) => {
	let data = {
		jd: calcJulDate(datetime),
		bodies: []
	};
	const bodies = [
		"SE_SUN",
		"SE_MOON",
		"SE_MERCURY",
		"SE_VENUS",
		"SE_MARS",
		"SE_JUPITER",
		"SE_SATURN",
		"SE_URANUS",
		"SE_NEPTUNE",
		"SE_PLUTO"
	];
	for (body of bodies) {
		const num = swisseph[body]
		const bodyData = await calcTransitionJd(data.jd, geo, num, false, true);
		data.bodies.push({
			num,
			body,
			...bodyData
		});
	}
	return data;
}

export const calcStarPos = async (datetime:string, starname:string) => {
	const jd = calcJulDate(datetime);
	const data = await calcStarPosJd(jd, starname);
	return { jd, ...data };
}

const calcStarPosJd = async (jd:number, starname:string) => {
	let data = { valid: false };
	if (isNumeric(jd) && notEmptyString(starname, 2)) {
		await fixedStar2UtAsync(starname, jd, swisseph.SEFLG_SWIEPH)
			.catch(result => {
				if (result instanceof Object) {
					if (result.name) {
						data.result = result;
						data.valid = true;
					}
				}
			});
		if (data.valid) {
			await fixstar2MagAsync(starname).catch(out => {
				if (out instanceof Object) {
					if (out.magnitude) {
						data.result.magnitude = out.magnitude;
					}
				}
			});
		}
	}
	return data;
}

/*
@param datetime:string isodate
@return Promise<Array<Object>>
*/
export const calcAllStars = async (datetime:string) => {
	let data = {
		valid: false,
		jd: calcJulDate(datetime),
		stars: []
	};
	if (validISODateString(datetime)) {
		for (star of stars) {
			const res = await calcStarPosJd(data.jd, star);
			data.stars.push({ star, ...res });
		}
	}
	data.valid = data.stars.some(row => row.valid);
	return data;
}

const matchNakshatra = (deg:number) => {
	let row = { index: -1 };
	const nkVal = deg / (360 / nakshatraValues.length);
	const index = Math.floor(nkVal);
	const percent = (nkVal % 1) * 100;
	if (index < nakshatraValues.length) {
		const nkRow = nakshatraValues[index];
		if (nkRow) {
			row = { index, num: (index + 1), percent, ...nkRow };
		}
	}
	return row;
}

/*
	add extra data for each body based on position
@param result:Object
@param body:Object
*/
const processBodyResult = (result:any, body: Graha) => {
	// for Ketu calculate opposing longitude
	if (body.hasCalc) {
		switch (body.calc) {
			case 'opposite':
				result.longitude = (result.longitude + 180) % 360;
				break;
		}
	}
	result.sign = Math.floor(result.longitude / 30) + 1;
	result.nakshatra = matchNakshatra(result.longitude);
	const ruler = grahaValues.find(b => b.ownSign.includes(result.sign));
	let rel = {
		natural: "",
	};
	if (ruler) {
		result.ruler = ruler.key;
		if (body.friends.includes(ruler.key)) {
			rel.natural = "friend";
		} else if (body.neutral.includes(ruler.key)) {
			rel.natural = "neutral";
		} else if (body.enemies.includes(ruler.key)) {
			rel.natural = "enemy";
		}
	}
	result.relationship = rel;
	result.withinSign = result.longitude % 30;
	result.isOwnSign = body.ownSign.indexOf(result.sign) >= 0;
	result.isMulaTrikon = result.sign === body.mulaTrikon && inRange(result.withinSign, body.mulaTrikonDegrees)
	result.isExalted = result.sign === body.exalted && inRange(result.withinSign, [0, body.exaltedDegree + 1]);
	result.isDebilitated = result.sign === body.debilitated && inRange(result.withinSign, [0, body.exaltedDegree + 1]);
	const attrKeys = ['key', 'ownSign', 'charaKarakaMode', 'jyNum', 'icon', 'bhuta', 'guna', 'caste', 'dhatu', 'dosha']

	attrKeys.forEach(attr => {
		if (body.hasOwnProperty(attr)) {
			result[attr] = body[attr];
		}
	})

	return result;
}

export const fetchHouseDataJd = async (jd, geo, system = 'W', mode = 'TRUE_CITRA') => {
	const iflag = swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SIDEREAL;
	const sid_mode_key = notEmptyString(mode, 2) ? ['SE_SIDM', mode.toUpperCase()].join('_') : '';
	if (sid_mode_key.length > 8 && swisseph.hasOwnProperty(sid_mode_key)) {
		swisseph.swe_set_sid_mode(swisseph[sid_mode_key], 0, 0);
	}
	let houseData = {};
	await getHouses(jd, iflag, geo.lat, geo.lng, system)
		.catch(res => {
			if (res instanceof Object) {
				if (res.house) {
					houseData = res;
				}
			}
		});
	return new HouseSet(houseData);
}

const fetchHouseData = async (datetime:string, geo, system = 'W') => {
	let houseData = {};
	//swisseph.swe_set_sid_mode(swisseph.SE_SIDM_TRUE_CITRA, 0, 0);
	if (validISODateString(datetime) && geo instanceof Object) {
		const jd = calcJulDate(datetime);
		houseData = await fetchHouseDataJd(jd, geo, system);
	}
	return houseData;
}

const addGrahaValues = async (data) => {
	for (const body of grahaValues) {
		const num = swisseph[body.ref];
		//swisseph.swe_set_sid_mode(swisseph.SE_SIDM_TRUE_CITRA, 0, 0);
		const flag = swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SIDEREAL + swisseph.SEFLG_SPEED;
		await calcUtAsync(data.jd, num, flag).catch(async result => {
			if (result instanceof Object) {
				if (!result.error) {
					processBodyResult(result, body);
					data.bodies.push({
						num: num,
						name: body.name,
						...result
					});
					if (!data.valid) {
						data.valid = true;
					}
				}
			}
		});
		if (data.bodies.length > 0) {
			const withinSignBodies = calcCharaKaraka(data.bodies);
			mergeCharaKarakaToBodies(data.bodies, withinSignBodies);
		}
	}
	data = new GrahaSet(data);
	data.matchRelationships();
}

const mergeCharaKarakaToBodies = (bodies, withinSignBodies) => {
	bodies = bodies.map(b => {
		const wb = withinSignBodies.find(sb => sb.key === b.key);
		if (wb) {
			b.charaKaraka = wb.ck;
		}
		return b;
	});
}

const addAsteroids = async (data) => {
	for (const body of asteroids) {
		const num = body.num + swisseph.SE_AST_OFFSET;
		await calcUtAsync(data.jd, num, swisseph.SEFLG_SIDEREAL).catch(result => {
			if (result instanceof Object) {
				result.valid = !result.error;
				data.bodies.push({
					refNum: num,
					bodyNum: body.num,
					bodyName: body.name,
					file: body.file,
					...result
				});
				if (!data.valid && !result.error) {
					data.valid = true;
				}
			}
		})
	}
}

/*
@param datetime:string IsoDate
@param mode:string (all|core|asteroids)
@param showBodyConfig:boolean
*/
export const calcAllBodies = async (datetime:string, mode:string = 'all') => {
	let data = { valid: false, jd: 0, bodies: [] };
	if (validISODateString(datetime)) {
		data.jd = calcJulDate(datetime);
		const showCore = mode === 'core' || mode === 'all';
		const showAsteroids = mode === 'asteroids' || mode === 'all';
		//swisseph.swe_set_sid_mode(swisseph.SE_SIDM_TRUE_CITRA, 0, 0);
		if (showCore) {
			await addGrahaValues(data);
		}

		if (showAsteroids) {
			await addAsteroids(data);
		}
	}
	return data;
}

const calcBodyJd = async (jd, key) => {
	let data = {};

	const body = grahaValues.find(b => b.key === key);
	if (body) {
		await calcUtAsync(jd, body.num, swisseph.SEFLG_SIDEREAL).catch(result => {
			if (result instanceof Object) {
				result.valid = !result.error;
				processBodyResult(result, body, false);
				data = {
					num: body.num,
					name: body.name,
					...result
				};
			}
		})
	}
	return new Graha(data);
}

const calcSunJd = async (jd) => calcBodyJd(jd, "su");

const fetchRashiSet = () => new RashiSet();

const fetchRashi = (key) => new RashiSet().get(key);

export const calcSphutaData = async (datetime, geo) => {
	const grahaSet = await calcGrahaSet(datetime);
	const houseData = await fetchHouseData(datetime, geo);
	const upagrahas = await calcUpagrahas(datetime, geo);
	const indianTimeData = await fetchIndianTimeData(datetime, geo);
	const data = await addSphutaData(grahaSet, houseData, indianTimeData, upagrahas);
	return { ...data };
}

const matchInduVal = (houseNum) => {
	const matchedGraha = rashiValues.find(r => r.num === houseNum);
	let indu = {};
	if (matchedGraha) {
		const induRow = induValues.find(v => v.graha === matchedGraha.ruler);
		if (induRow) {
			indu = { ...induRow, houseNum }
		}
	}
	return indu;
}

const degreeDistance = (degOne, degTwo) => ((degTwo - degOne) + 360) % 360;

const degreeToSign = (deg) => Math.floor(deg / 30) + 1;

const addCycleInclusive = (one, two, radix) => {
	return (((one - 1) + two) % radix) + 1;
}

const subtractCycleInclusive = (one, two, radix) => {
	return (((one - 1) - two + radix) % radix) + 1;
}

const addSphutaData = async (grahaSet, houseData, iTime, upagrahas) => {
	const { bodies } = grahaSet;
	let data = grahaSet;
	const grahaLngs = grahaSet.longitudes();
	data.houseSign = Math.floor(houseData.houses[0] / 30) + 1;
	const moon = grahaSet.moon();

	data.srIlagna = (((moon.nakshatra.percent / 100) * 360) + houseData.ascendant) % 360;

	data.houseSignPlusNine = (((data.houseSign - 1) + (9 - 1)) % 12) + 1;
	const lagnaInduRow = matchInduVal(data.houseSignPlusNine);

	data.moonSignPlusNine = (((moon.sign - 1) + (9 - 1)) % 12) + 1;

	const moonInduRow = matchInduVal(data.moonSignPlusNine);

	//console.log(lagnaInduRow.value, moonInduRow.value, moon.sign)

	data.induLagna = ((lagnaInduRow.value + moonInduRow.value + moon.sign) % 12) + 1;

	const sunAtSunRise = await calcSunJd(iTime.dayStart());

	data.ghatiLagna = ((iTime.ghatiVal() * 30) + sunAtSunRise.longitude) % 360;

	const bhava = iTime.ghatiVal() / 5;

	data.bhavaLagna = (sunAtSunRise.longitude + (bhava * 30)) % 360;
	//data.ghatiAsDegree = indianTimeData.ghatiVal * 6;


	data.horaLagna = (sunAtSunRise.longitude + (iTime.progress() * 720)) % 360;

	data.varnadaLagna = calcVarnadaLagna(data, houseData);

	data.yogiSphuta = grahaSet.calcYogiSphuta(bodies);

	const yogiSphutaNk = matchNakshatra(data.yogiSphuta);
	data.yogi = yogiSphutaNk.ruler;
	data.avayogiSphuta = (data.yogiSphuta + (560 / 3)) % 360;
	const avayogiSphutaNk = matchNakshatra(data.avayogiSphuta);
	data.avayogi = avayogiSphutaNk.ruler;
	data.bijaSphuta = grahaSet.calcBijaSphuta();
	data.ksetraSphuta = grahaSet.calcKsetraSphuta();
	// The tithi of result of = ceiling(mod(mod((Moon's degree-Sun's degree)*5,360)/12,15),1) 


	data.santanaTithi = matchTithiNum(bodies, 5);

	// prāṅasphuta    -> my chart= 156.55     -> formula= ((Lagna's degree x 5)+Gulika's degree) / mod 360
	const gulika = upagrahas.values.find(row => row.key === 'gu');
	data.pranaSphuta = ((houseData.ascendant * 5) + gulika.upagraha) % 360;

	// formula= ((Moon's degree x 8)+Gulika's degree) / mod 360
	data.dehaSphuta = ((grahaLngs.mo * 8) + gulika.upagraha) % 360;

	//mṛtusphuta     -> my chart= 321.899999 -> formula= ((Gulika's degree x 7)+Sun's degree) / mod 360
	data.mrtuSphuta = ((gulika.upagraha * 7) + grahaLngs.su) % 360;

	// trisphuta      -> my chart= 178.52     -> formula= Prāṅasphuta + Dehasphuta + Mṛtusphuta / mod 360
	data.triSphuta = (houseData.ascendant + grahaLngs.mo + gulika.upagraha) % 360;

	// catusphuta     -> my chart= 251.73     -> formula= Trisphuta + Sun's degree / mod 360
	data.catuSphuta = (data.triSphuta + grahaLngs.su) % 360;

	// pañcasphuta    -> my chart= 18.35      -> formula= Catusphuta + Rahu's degree / mod 360
	data.pancaSphuta = (data.catuSphuta + grahaLngs.ra) % 360;

	// bṛghu bindu    -> my chart= 189.5      -> formula= Version1=(Moon degree+Rahu degree) / 2, counting from Rahu --- Version2=(Moon degree+Rahu degree) / 2 (shortest distance) less 180
	data.brghuBindu = ((grahaLngs.mo + grahaLngs.ra) / 2) % 360;
	return data;
}

const calcVarnadaLagna = (data, houseData) => {
	const lagnaSign = degreeToSign(houseData.ascendant);
	const horaSign = degreeToSign(data.horaLagna);
	const lagnaEven = lagnaSign % 2 === 0;
	const horaEven = horaSign % 2 === 0;
	const lagnaSign2 = lagnaEven ? (12 - lagnaSign) + 1 : lagnaSign;
	const horaSign2 = horaEven ? (12 - horaSign) + 1 : horaSign;
	const bothSame = lagnaEven === horaEven;
	const ascendantWithinDegree = houseData.ascendant % 30;
	const varnadaSignMultiplier = bothSame ? addCycleInclusive(horaSign2, lagnaSign2, 12) : subtractCycleInclusive(lagnaSign2, horaSign2, 12);
	return ((varnadaSignMultiplier - 1) * 30) + ascendantWithinDegree;
}

const matchBodyLng = (key, bodies, retVal = -1) => {
	const graha = bodies.find(b => b.key === key);
	if (graha) {
		return graha.longitude;
	}
	return retVal;
}

const matchTithiNum = (bodies, multiplier = 1) => {
	const sunMoonAngle = relativeAngle(matchBodyLng("su", bodies, 0), matchBodyLng("mo", bodies, 0), multiplier);
	const tithiVal = sunMoonAngle / (360 / 30);
	return Math.floor(tithiVal) + 1;
}

/*
@param body:Object
@param index:int
*/
const applyCharaKaraka = (body, index) => {
	body.ck = "";
	if (index < charaKaraka.length) {
		body.ck = charaKaraka[index];
	}
	return body;
}

/*
Add charaKara data
@param bodies:Array<Object>
@return Array<Object>
*/
const calcCharaKaraka = (bodies) => {
	let withinSignBodies = bodies.filter(b => b.charaKarakaMode !== "none").map(b => {
		const deg = b.charaKarakaMode === "reverse" ? 30 - b.withinSign : b.withinSign;
		return {
			key: b.key,
			deg
		}
	})
	withinSignBodies.sort((a, b) => a.deg - b.deg);
	return withinSignBodies.map(applyCharaKaraka);
}

/*
@param Array<Object>
@return Array<Object>
*/
const calcAprakasaValues = (bodies) => {
	const sun = bodies.find(b => b.key === "su");
	if (sun instanceof Object) {
		return calcAprakasa(sun.longitude);
	} else {
		return [];
	}
}
/*
Calculate Aprakasa values from the the sun's longitude
*/
const calcAprakasa = (sunLng = 0) => {
	let items = [];

	let prevVal = null;
	aprakasa.forEach(row => {
		let refVal = 0;
		const { ref } = row;
		switch (ref.obj) {
			case "su":
				refVal = sunLng
				break;
			case "-":
				refVal = prevVal;
				break;
		}
		if (ref.op === "-") {
			refVal = 0 - refVal;
		}
		const value = dmsToDegrees(row.offset) + refVal;
		prevVal = value;
		items.push({
			value,
			name: row.name
		});
	});
	return items;
}

const calcGrahaSet = async (datetime) => {
	const bodyData = await calcAllBodies(datetime, 'core');
	return new GrahaSet(bodyData);
}

/*
@param datetime:string isodate
@param geo: latLng
@param system:string
*/
export const calcBodiesInHouses = async (datetime, geo, system = 'W') => {
	let grahaSet = await calcGrahaSet(datetime);

	const houseData = await fetchHouseData(datetime, geo, system);

	grahaSet.mergeHouseData(houseData);


	const apValues = calcAprakasaValues(grahaSet.bodies);
	const upagrahas = await calcUpagrahas(datetime, geo);

	const rashis = matchRashis(houseData, grahaSet);

	return { ...grahaSet, ...houseData, aprakasa: apValues, upagrahas, rashis };
}

/*
@param datetime: string isodate
@param geo: latLng
@param system: string
	*/
export const calcVargas = async (datetime, geo, system = 'W') => {
	let grahaSet = await calcGrahaSet(datetime);

	const houseData = await fetchHouseData(datetime, geo, system);

	grahaSet.mergeHouseData(houseData);

	const vargas = grahaSet.getFullVargaSet(houseData.ascendant);
	return { jd: houseData.jd, datetime, geo, vargas };
}

const matchRashis = (houseData, bodyData) => {
	return houseData.houses.map((deg, houseIndex) => {
		const houseSignIndex = Math.floor(deg / 30);
		const rashiRow = rashiValues[houseSignIndex];
		const graha = bodyData.bodies.find(b => b.key === rashiRow.ruler);
		const houseNum = houseIndex + 1;
		//const houseSignNum = houseSignIndex + 1;
		let lordInHouse = -1;
		let lordInSign = null;
		if (graha) {
			lordInHouse = graha.house;
			lordInSign = Math.ceil(graha.longitude / 30);
		}
		const diff = lordInSign - rashiRow.num;
		let houseDifference = ((diff + 12) % 12) + 1;
		switch (houseDifference) {
			case 1:
				//case 7:
				houseDifference = 10;
				break;
		}

		const arudhaIndex = ((lordInHouse - 1) + (houseDifference - 1)) % 12;
		//const arudhaSignIndex = (lordInSign + signCount) % 12;
		//const arudhaHouseIndex = houseData.houses.indexOf(arudhaSignIndex * 30);
		const arudhaInHouse = arudhaIndex + 1;
		const arudhaRow = arudhaValues[houseIndex];
		const arudha = { house: arudhaInHouse, ...arudhaRow };
		return { ...rashiRow, houseNum, lordInHouse, houseDifference, arudhaInHouse, arudha };
	});
}


/*
@param sunLng:number
@param moonLng:number
*/
const relativeAngle = (sunLng, moonLng, multiplier = 1) => {
	const mn = ((moonLng - sunLng) * multiplier) % 360;
	return mn < 0 ? 360 + mn : mn;
};

const matchCaughadia = ({ jd, weekDay, dayStart, dayLength, isDaytime }) => {
	const caughadiaDayRow = caughadiaData.days.find(row => row.day === weekDay);
	const caughadiaStart = isDaytime ? caughadiaDayRow.dayStart : caughadiaDayRow.nightStart;
	const caughadiaEighths = Array.from({ length: 8 }, (x, i) => (((caughadiaStart - 1) + i) % 7) + 1);
	const eighthJd = (dayLength / 8);
	return caughadiaEighths.map((num, ri) => {
		const cRow = caughadiaData.values.find(row => row.num === num);
		const startJd = dayStart + (ri * eighthJd);
		const active = jd >= startJd && jd < (startJd + eighthJd);
		return { ...cRow, startJd, startDt: jdToDateTime(startJd), active };
	});
}

const calcJdPeriodRange = (num, startJd, periodLength) => {
	const start = startJd + ((num - 1) * periodLength);
	const end = startJd + (num * periodLength);
	return {
		start,
		end,
		startDt: jdToDateTime(start),
		endDt: jdToDateTime(end)
	};
}

const matchKalam = ({ jd, weekDay, dayBefore, sunData }) => {
	const kalamDayRow = kalamData.values.find(row => row.day === weekDay);
	const dayTimeStart = dayBefore ? sunData.prevRise.jd : sunData.rise.jd;
	const dayTimeLength = dayBefore ? sunData.prevSet.jd - dayTimeStart : sunData.set.jd - dayTimeStart;
	const eighthJd = (dayTimeLength / 8);
	const ranges = Object.entries(kalamData.dict).map(entry => {
		const [key, name] = entry;
		const range = calcJdPeriodRange(kalamDayRow[key], dayTimeStart, eighthJd);
		const active = jd >= range.start && jd < range.end;
		const num = kalamDayRow[key];
		return { key, name, num, ...range, active };
	})
	return { dayTimeStart, dayTimeStartDt: jdToDateTime(dayTimeStart), day: kalamDayRow.day, ranges };
}

/*
Calculate panchanga
*/
export const calcPanchanga = async (datetime, geo) => {
	if (!geo.alt) {
		geo.alt = ephemerisDefaults.altitude;
	}
	swisseph.swe_set_topo(geo.lng, geo.lat, geo.alt);
	const grahaSet = await calcGrahaSet(datetime);

	const sun = grahaSet.sun();

	const moon = grahaSet.moon();

	const sunMoonAngle = relativeAngle(sun.longitude, moon.longitude);

	const tithiVal = sunMoonAngle / (360 / 30);
	const tithiPercent = (tithiVal % 1) * 100;
	const tithiNum = Math.ceil(tithiVal);
	const tithiRow = tithiValues.find(t => t.num === tithiNum);
	const tithi = { ...tithiRow, percent: tithiPercent, remainder: (100 - tithiPercent) }

	const numYogas = yogaValues.length;
	const yogaDeg = (360 / numYogas);
	const yogaVal = (sun.longitude + moon.longitude) / yogaDeg;
	const yogaIndex = Math.floor(yogaVal);
	let yogaRow = {};
	if (yogaIndex < numYogas) {
		yogaRow = yogaValues[yogaIndex];
	}
	const yogaPercent = (yogaVal % 1) * 100;
	const yoga = { ...yogaRow, index: yogaIndex, percent: yogaPercent, remainder: (100 - yogaPercent) };

	const karanaVal = sunMoonAngle / (360 / 60);
	const karanaPercent = (karanaVal % 1) * 100;
	const karanaNum = Math.ceil(karanaVal);
	const karanaRow = karanaData.karanas.find(r => r.locations.includes(karanaNum));

	const karana = {
		num: karanaNum,
		...karanaRow,
		percent: karanaPercent
	};

	const { jd, startJd, sunData, dayLength, dayBefore, periodHours, isDaytime, weekDay } = await calcJyotishSunRise(datetime, geo);
	const { rise, set, nextRise } = sunData;
	const sameDay = !dayBefore;
	const dayStart = sameDay ? rise.jd : nextRise.jd;
	const dayProgress = ((jd - dayStart) / dayLength) * 100;
	const varaRow = varaValues[weekDay];

	const vara = {
		...varaRow,
		sunRise: sunData.rise.dt,
		dayLength,
		percent: dayProgress
	};

	const hora = await calcHoras(datetime, geo);
	const caughadia = matchCaughadia({ jd, weekDay, dayStart, dayLength, isDaytime });
	const muhurta = await calcMuhurta(datetime, geo);
	const muhurtaRange = await calcDayMuhurtas(datetime, geo);
	const kalam = matchKalam({ jd, weekDay, dayBefore, sunData });

	const dms = {
		sunMoonAngle: degAsDms(sunMoonAngle),
		sun: degAsDms(sun.longitude),
		moon: degAsDms(moon.longitude),
	};

	return {
		...grahaSet, sunMoonAngle, tithi, dms, yoga, karana, vara, hora, caughadia, muhurta, muhurtaRange, kalam
	}
}
