const Graph = require('graph-core');

module.exports = function computeVertexStep(
  graph,
  results,
  curr,
  step,
  setDelayedExecutionCallback
) {
  if (!curr) {
    curr = graph.vertices(step.vtype);
  } else {
    const refs = new WeakSet();
    curr = curr.filter(v => {
      if (refs.has(v)) {
        return false;
      }
      refs.add(v);
      return step.vtype ? v[Graph.TYPE] === step.vtype : true;
    });
  }
  if (step.filter) {
    curr = curr.filter(step.filter);
  }
  if (step.varName) {
    if (step.delayed) {
      setDelayedExecutionCallback(vertices => {
        results[step.varName] = vertices;
      });
    } else {
      curr = Array.from(curr);
      results[step.varName] = curr;
    }
  }
  return curr;
};
