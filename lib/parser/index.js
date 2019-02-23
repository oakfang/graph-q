const parseEdgeString = require('./edge');
const parseVertexString = require('./vertex');

const generalEdgeRegex = /(<-(?:\[.*?\])?-)|(-(?:\[.*?\])?->)/g;

module.exports = function parseQueryString(qString, state) {
  const rawSteps = qString.split(generalEdgeRegex);
  console.log(rawSteps)
  return rawSteps
    .filter(Boolean)
    .map((step, idx) =>
      idx % 2 ? parseEdgeString(step, state) : parseVertexString(step, state)
    );
};
