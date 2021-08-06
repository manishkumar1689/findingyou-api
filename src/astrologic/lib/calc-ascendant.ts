import { calcJulDate, julToISODate } from "./date-funcs";
import { subtractLng360 } from "./math-funcs";

export const degToPi = (deg: number): number => deg * (Math.PI / 180);

export const cosDeg = (deg: number): number => Math.cos(degToPi(deg));

export const sinDeg = (deg: number): number => Math.sin(degToPi(deg));

export const tanDeg = (deg: number): number => Math.tan(degToPi(deg));

export const mod360 = (num: number): number => num % 360;

const calcOblique = (jd = 0): number => {
	const t = (jd - 2451545.0) / 36525.0;
	const omg = mod360(125.00452 - t *   1934.136261);
	const ls  = mod360(280.4665  + t *  36000.7698);
	const lm  = mod360(218.3165  + t * 481267.8813);
	const e = 84381.448 + t * (-46.8150 + t * (-0.00059 + t * 0.001813));
	let deps  =  9.20 * cosDeg(1.0 * omg);
  deps +=  0.57 * cosDeg(2.0 * ls);
  deps +=  0.10 * cosDeg(2.0 * lm);
  deps += -0.09 * cosDeg(2.0 * omg);
	return (e + deps) / 3600.0;
}


const calcNutation = (jd = 0): number => {
	const t = (jd - 2451545.0) / 36525.0;
	const omg = mod360(125.00452 - t *   1934.136261);
	const ls  = mod360(280.4665  + t *  36000.7698);
	const lm  = mod360(218.3165  + t * 481267.8813);
	let dpsi  = -17.20 * sinDeg(1.0 * omg);
  dpsi +=  -1.32 * sinDeg(2.0 * ls);
  dpsi +=  -0.23 * sinDeg(2.0 * lm);
  dpsi +=   0.21 * sinDeg(2.0 * omg);
	return dpsi;
}

const calLST = (jd, lng) => {
	const jd0 = Math.floor(jd - 0.5) + 0.5;
	const t = (jd0 - 2451545.0) / 36525.0;
	const utRaw = (jd - jd0) * 360.0 * 1.002737909350795;
	const ut = utRaw < 0? utRaw + 360.0 : utRaw;
	const gstRaw  = 0.279057273 + 100.0021390378 * t + 1.077591667e-06 * t * t;
	const gst  = (gstRaw - Math.floor(gstRaw)) * 360;

	const lstRaw = mod360(gst + ut + lng);
	const dpsi = calcNutation(jd);
	const eps  = calcOblique(jd);
	return (lstRaw + (dpsi * cosDeg(eps) / 3600.0) + 360) % 360;
}


export const calcTropicalAscendant = (lat = 0, lng = 0, jd = 0): number => {
	const lst = calLST(jd, lng);
	const obl = calcOblique(jd);
	const ascX = cosDeg(lst);
	const ascYRaw = -(sinDeg(obl) * tanDeg(lat));
	const ascY = ascYRaw - cosDeg(obl) * sinDeg(lst);
	return (mod360(Math.atan2(ascX, ascY) / (Math.PI / 180)) + 360) % 360;
}


export const calcOffsetAscendant = (lat = 0, lng = 0, jd = 0, ayanamshaValue = 0): number => {
	const asc = calcTropicalAscendant(lat, lng, jd);
	return subtractLng360(asc, ayanamshaValue);
}

export const calcTropicalAscendantDt = (lat = 0, lng = 0, dt = ""): number => {
	const jd = calcJulDate(dt);
	return calcTropicalAscendant(lat, lng, jd);
}

export const calcAscendantTimeline = (subDiv = 12, lat = 0, lng = 0, startJd = 0, endJd = 0, ayanamshaValue = 0) => {
	const asc = calcOffsetAscendant(lat, lng, startJd, ayanamshaValue);
	const degInterval = 360 / subDiv;
	const nextLng = asc < ((subDiv-1) * (360/subDiv)) ? Math.ceil(asc / degInterval) * degInterval : 0;
	const startDiff = subtractLng360(nextLng, asc);
	const startMins = startDiff < 5 ? 0 : Math.floor(startDiff);
	const minuteJd = 1 / 1440;
	let currJd = startJd + (startMins * minuteJd);
	const items = [];
	let counter = 0;
	let prevLng = asc;
	let prevJd = currJd;
	while (currJd < endJd && counter < 1000000) {
		currJd += minuteJd;
		const nextLng = calcOffsetAscendant(lat, lng, currJd, ayanamshaValue);
		const absVal = Math.abs(nextLng % degInterval);
		const distance = absVal > (degInterval / 2) ? 0 - (degInterval - absVal) : absVal;
		const diff = subtractLng360(nextLng, prevLng);
		const progress = distance / diff;
		prevLng = nextLng;
		if (distance < 0.2 && distance > -0.2) {
			const targetJd = currJd - (progress * minuteJd);
			const targetLng = calcOffsetAscendant(lat, lng, targetJd, ayanamshaValue);
			const multiplier = 30 / (diff * 3);
			currJd += (minuteJd * multiplier);
			const duration = targetJd - prevJd;
			items.push({ jd: targetJd, lng: targetLng, duration });
			prevJd = targetJd;
		}
		counter++;
	}
	return { items, startJd, endJd, dur: endJd - startJd, startDiff };
}

export const calcAscendantIntervalTimelineItems = (lat = 0, lng = 0, startJd = 0, endJd = 0, ayanamshaValue = 0) => {
	return calcAscendantTimelineItems(12, lat, lng, startJd, endJd, ayanamshaValue);
}

export const calcAscendantTimelineItems = (subDiv = 12, lat = 0, lng = 0, startJd = 0, endJd = 0, ayanamshaValue = 0) => {
	const data = calcAscendantTimeline(subDiv, lat, lng, startJd, endJd, ayanamshaValue);
	const degInterval = 360 / subDiv;
	data.items = data.items.map(item => {
		const lng = Math.round(item.lng);
		const sign = Math.floor(lng / degInterval) + 1; 
		return { ...item, lng, sign, dt: julToISODate(item.jd) }
	});
	return data;
}