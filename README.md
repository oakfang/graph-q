# graph-q

A query language over the graph-core graph.

## Usage

```js
const q = require('graph-q');
const graph = require('./graph');

// get all User typed vertices from the graph
const { users } = q(graph)`(users:User)`;
// get all User typed vertices from the graph
// with the username "foobar"
q(graph)`(users:User{username:"foobar"})`;
// get all resources that have an edge into them
// from User typed vertices
q(graph)`(:User)-->(r:Resource)`;
// get all resources that are owned by users
q(graph)`(:User)-[:owns]->(r:Resource)`;
// get all users who own a resource
q(graph)`(?users:User)-[:owns]->(:Resource)`;
q(graph)`(:Resource)<-[:owns]-(users:User)`;
```
