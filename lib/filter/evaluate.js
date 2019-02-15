const { parse } = require('acorn');
const {
  record,
  tuple,
  string,
  isinstance,
  typeby,
  union,
  arrayOf,
} = require('xype');
const { SyntaxError } = require('../consts');

const ValidValue = union(
  record({
    type: 'Literal',
  }),
  typeby(x => isinstance(x, ValidObjectExpression)),
  typeby(x => isinstance(x, ValidArrayExpression))
);

const ValidProperty = record({
  type: 'Property',
  method: false,
  shorthand: false,
  computed: false,
  key: {
    type: 'Identifier',
    name: string,
  },
  value: ValidValue,
});

const ValidObjectExpression = record({
  type: 'ObjectExpression',
  properties: [ValidProperty],
});

const ValidArrayExpression = record({
  type: 'ArrayExpression',
  elements: [ValidValue],
});

const ValidFilter = record({
  type: 'Program',
  body: tuple(
    record({
      type: 'ExpressionStatement',
      expression: ValidObjectExpression,
    })
  ),
});

module.exports = function evaluateFilter(filterString) {
  const ast = parse(filterString);
  if (!isinstance(ast, ValidFilter)) {
    throw new SyntaxError('Invalid node filter syntax');
  }
  return eval(filterString);
};
