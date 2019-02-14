const Graph = require('graph-core');
const { isMatch } = require('lodash/fp');
const EDGE = 'edge';
const VERTEX = 'vertex';
const PREFIX = `$$${Math.floor(Math.random() * 100)}`;

class SyntaxError extends Error {}

function getFilter(filter, state, expand) {
  if (!filter) return null;
  if (filter.startsWith(`{${PREFIX}`)) {
    const key = filter.substring(1, filter.length - 1);
    return state[key];
  }
  let filterObject = eval(`(${filter})`);
  if (expand) {
    filterObject = {
      [expand]: filterObject,
    };
  }
  return isMatch(filterObject);
}

function parseVertexString(vertexString, state) {
  const match = vertexString.match(/\((.*?)?\)/);
  if (!match) {
    throw new SyntaxError(`Bad vertex string: ${vertexString}`);
  }
  const node = {
    type: VERTEX,
  };
  const [, params] = match;
  if (params) {
    const [rest, filter] = params.split(/(\{.*\})$/);
    let [vName, type] = rest.split(':');
    let delayed = false;
    if (vName.startsWith('?')) {
      delayed = true;
      vName = vName.substr(1);
    }
    Object.assign(node, {
      delayed,
      varName: vName || null,
      vtype: type || null,
      filter: getFilter(filter, state),
    });
  }
  return node;
}

function parseEdgeString(edgeString, state) {
  const node = {
    type: EDGE,
    out: edgeString.endsWith('>'),
  };
  const match = edgeString.match(/(-\[(.*?)\]?->)|(<-\[(.*?)\]?-)/);
  if (match) {
    const [, , p1, , p2] = match;
    const params = p1 || p2;
    const [rest, filter] = params.split(/(\{.*\})$/);
    const [vName, type] = rest.split(':');
    Object.assign(node, {
      varName: vName || null,
      etype: type || null,
      filter: getFilter(filter, state, 'properties'),
    });
  }
  return node;
}

function parseQueryString(qString, state) {
  const rawSteps = qString.split(/(<-.*?-)|(-.*?->)/g);
  return rawSteps
    .filter(Boolean)
    .map((step, idx) =>
      idx % 2 ? parseEdgeString(step, state) : parseVertexString(step, state)
    );
}

function getQStringAndState(stringFrags, values) {
  const state = {};
  const qString = stringFrags
    .reduce((str, frg, idx) => {
      let value = values[idx - 1];
      if (typeof value === 'function') {
        const v = PREFIX + idx;
        state[v] = value;
        value = `{${v}}`;
      } else {
        value = JSON.stringify(value);
      }
      return str + value + frg;
    })
    .replace(/\s+/g, '');
  return { state, qString };
}

function computeVertexStep(
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
}

function computeEdgeStep(
  graph,
  results,
  curr,
  step,
  callDelayedExecutionCallback
) {
  curr = curr.map(v =>
    step.out ? graph.outEdges(v[Graph.ID]) : graph.inEdges(v[Graph.ID])
  );
  if (curr.flatten) {
    curr = curr.flatten();
  } else {
    curr = curr.reduce((root, sub) => root.concat(Array.from(sub)), []);
  }
  if (step.etype) {
    curr = curr.filter(e => e.type === step.etype);
  }
  if (step.filter) {
    curr = curr.filter(step.filter);
  }
  if (callDelayedExecutionCallback) {
    curr = Array.from(curr);
    const refs = new Set();
    for (let { origin, target } of curr) {
      const ref = step.out ? origin : target;
      refs.add(ref);
    }
    callDelayedExecutionCallback(Array.from(refs));
  }
  if (step.varName) {
    curr = Array.from(curr);
    results[step.varName] = curr;
  }
  return curr.map(e => (step.out ? e.target : e.origin));
}

function createReducer(graph, results) {
  let delayedExecutionCallback = null;
  const setDelayedExecutionCallback = cb => {
    delayedExecutionCallback = cb;
  };
  return (curr, step) =>
    step.type === VERTEX
      ? computeVertexStep(
          graph,
          results,
          curr,
          step,
          setDelayedExecutionCallback
        )
      : computeEdgeStep(graph, results, curr, step, delayedExecutionCallback);
}

module.exports = (graph, debug) => (stringFrags, ...values) => {
  const { qString, state } = getQStringAndState(stringFrags, values);
  const steps = parseQueryString(qString, state);
  const results = {};
  if (debug) {
    results._steps = steps;
  }
  steps.reduce(createReducer(graph, results), null);
  return results;
};
