const kotaPaalaValues = [
  ["ve","ve","ve","mo"],
  ["mo","mo","mo","mo"],
  ["su","su","su","su"],
  ["su","mo","mo","mo"],
  ["mo","mo","ma","ma"],
  ["ma","ma","ma","ve"],
  ["ma","ma","mo","mo"],
  ["mo","mo","mo","me"],
  ["me","me","me","me"],
  ["sa","sa","sa","sa"],
  ["sa","me","me","me"],
  ["me","me","sa","sa"],
  ["sa","mo","me","me"],
  ["sa","sa","mo","mo"],
  ["mo","mo","mo","ju"],
  ["ju","ju","ju","ju"],
  ["ju","ju","ju","ju"],
  ["ju","mo","mo","mo"],
  ["mo","mo","sa","sa"],
  ["sa","ju","sa","me"],
  ["sa","sa","ve","ve"],
  ["ma","ma","ma","ma"],
  ["ma","ma","ma","ma"],
  ["ma","mo","mo","mo"],
  ["mo","mo","ju","ju"],
  ["ju","ju","ve","ve"],
  ["ju","ju","ve","ve"]
];

const padNakIndices = (deg: number): number[] => {
	const degPerNak = (360/27);
	const padaIndex = Math.floor(deg / (degPerNak / 4))  % 4;
	const nakIndex = Math.floor(deg / degPerNak);
	return [nakIndex, padaIndex];
}

export const matchKotaPala = (deg: number): string => {
	const [nakIndex, padaIndex] = padNakIndices(deg);
	return nakIndex < kotaPaalaValues.length && padaIndex < 4? kotaPaalaValues[nakIndex][padaIndex] : "";
}

export default kotaPaalaValues;