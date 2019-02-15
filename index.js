const { getQStringAndState, parse, run } = require('./lib');

module.exports = (graph, query, debug) => {
  const qRun = (stringFrags, ...values) => {
    const { qString, state } = getQStringAndState(stringFrags, values);
    const steps = parse(qString, state);
    return run(graph, steps, debug);
  };
  return query ? qRun([query]) : qRun;
};
