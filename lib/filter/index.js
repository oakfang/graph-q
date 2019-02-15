const { PREFIX } = require('../consts');
const evaluateFilter = require('./evaluate')
const isMatch = require('./match');

const filterPattern = /(\{.*\})$/;

function getFilter(filter, state, expand) {
  if (!filter) return null;
  if (filter.startsWith(`{${PREFIX}`)) {
    const key = filter.substring(1, filter.length - 1);
    return state[key];
  }
  let filterObject = evaluateFilter(`(${filter})`);
  if (expand) {
    filterObject = {
      [expand]: filterObject,
    };
  }
  return isMatch(filterObject);
}

module.exports = { filterPattern, getFilter };
