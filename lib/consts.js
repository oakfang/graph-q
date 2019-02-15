const EDGE = 'edge';
const VERTEX = 'vertex';
const PREFIX = `$$${Math.floor(Math.random() * 100)}`;
class SyntaxError extends Error {}

module.exports = { EDGE, VERTEX, PREFIX, SyntaxError };
