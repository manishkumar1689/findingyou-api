

class BaseObject {
  toObject() {
    const entries = Object.entries(this).filter(entry => entry[0].startsWith('_') === false).map(entry => {
      const [k, v] = entry;
      if (v instanceof Function && v.length < 1) {
        return [k, v()];
      } else {
        return entry;
      }
    });
    return Object.fromEntries(entries);
  }
}

module.exports = { BaseObject };