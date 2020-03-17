const util = require("util");
const exec = require('child_process').exec;
const { isNumeric, isInteger, notEmptyString, emptyString, validLocationParameter, validISODateString } = require("./validators");
const run = util.promisify(exec);

const chartData = async (dt, loc) => {

  const script_dir = __dirname + '/../scripts/';
  let datetime = "";
  let location = "";
  let result = { valid: false };
  if (dt && loc) {
    if (validISODateString(dt)) {
      datetime = dt;
    }
    if (validLocationParameter(loc)) {
      location = loc;
    }
  }
  if (datetime.length > 5 && location.length > 5) {
    const cmd =  [`${script_dir}astro`, datetime, location].join(' ');

    const out = await run(cmd);
    if (emptyString(out.stderr) && notEmptyString(out.stdout)) {
	    result = JSON.parse( out.stdout);
    }
  } else {
    result = {valid:false,msg:"Invalid datetime or location parameters"};
  }
  return result;
}

module.exports = { chartData };