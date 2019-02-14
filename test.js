const test = require('nefarious');
const Graph = require('graph-core');
const q = require('.');

test.beforeEach(t => {
  const g = new Graph();
  g.setVertex('foo', 'Person', { name: 'foo' });
  g.setVertex('bar', 'Person', { name: 'bar' });
  g.setVertex('cat', 'Animal', { name: 'cat' });
  g.setVertex('home', 'Place', { name: 'Home' });
  g.setVertex('pt', 'Place', { name: 'Petah Tikva' });
  g.setEdge('foo', 'bar', 'friend');
  g.setEdge('bar', 'foo', 'friend');
  g.setEdge('bar', 'cat', 'owns-a');
  g.setEdge('bar', 'cat', 'likes-a');
  g.setEdge('cat', 'bar', 'hates', { reason: 'meow' });
  g.setEdge('foo', 'home', 'visited', { at: Date.now() });
  g.setEdge('bar', 'pt', 'lives-in', { at: Date.now() });
  t.context.g = g;
});

test('bad syntax', t => {
  t.throws(() => {
    q(t.context.g)`p:Person)`;
  });
});

test('basic query', t => {
  const { p: results } = q(t.context.g)`(p:Person)`;
  t.is(results.length, 2);
});

test('basic filtered query', t => {
  const { p: results } = q(t.context.g)`(p:Person{name:"foo"})`;
  t.is(results.length, 1);
  const [foo] = results;
  t.is(foo.name, 'foo');
});

test('advanced filtered query', t => {
  const { p: results } = q(t.context.g)`(p${v => v.name.includes('a')})`;
  t.is(results.length, 3);
});

test('match against edges', t => {
  const { e: results } = q(t.context.g)`(:Person)-[e]->`;
  t.is(results.length, 6);
});

test('match against edges with type', t => {
  const { e: results } = q(t.context.g)`(:Person)-[e:visited]->`;
  t.is(results.length, 1);
  const [{ origin }] = results;
  t.is(origin.name, 'foo');
});

test('match against edges, filtered', t => {
  const { e: results } = q(t.context.g)`
  (:Person)-[e${({ properties }) => properties.at}]->
  `;
  t.is(results.length, 2);
});

test('match against full path', t => {
  const { v: results } = q(t.context.g)`
    (:Person)-->(v)
  `;
  t.is(results.length, 5);
});

test('misc queries', t => {
  const { g } = t.context;
  const { places, _steps } = q(g, true)`(:Person)-->(places:Place)`;
  t.is(_steps.length, 3);
  t.is(places.length, 2);
  const { visitors, visits } = q(g)`
    (:Place)<-[visits:visited]-(visitors:Person{name:"foo"})
  `;
  t.is(visits.length, 1);
  t.is(visitors.length, 1);
  const [foo] = visitors;
  t.is(foo.name, 'foo');

  const { any } = q(g)`(any)-->()`;
  t.is(any.length, Array.from(g.vertices()).length);
});

test('delayed evalution of parameters', t => {
  const { g } = t.context;
  function testScenario({ hated, haters }) {
    t.is(haters.length, 1);
    const [cat] = haters;
    t.is(cat.name, 'cat');

    t.is(hated.length, 1);
    const [bar] = hated;
    t.is(bar.name, 'bar');
  }
  testScenario(q(g)`
    (?hated)<-[:hates{reason:"meow"}]-(haters)
  `);
  testScenario(q(g)`
    (?haters)-[:hates{reason:"meow"}]->(hated)
  `);
});

test('Injecting non functions', t => {
  const { g } = t.context;
  const name = 'foo';
  const { v } = q(g)`({name:${name}})-->(v)`;
  t.is(v.length, 2);
});

test('long query', t => {
  const { g } = t.context;
  const { withFriends, haters, hated } = q(g)`
  ()-[:friend]->(withFriends:Person)
    -[:owns-a]->(haters)
    -[:hates]->(hated)
  `;
  t.is(withFriends.length, 2);
  t.is(haters.length, 1);
  const [cat] = haters;
  t.is(cat.name, 'cat');

  t.is(hated.length, 1);
  const [bar] = hated;
  t.is(bar.name, 'bar');
});
