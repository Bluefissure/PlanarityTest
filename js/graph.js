// import { nodes, edges } from '../data/data.js';
import { PlanarityChecker } from '../js/planarity.js';

let forceSimulation = null;

function draw(nodes, edges) {
  let svg = d3.select('svg');
  svg.selectAll('*').remove();
  svg.innerHTML = '';
  let width = svg.attr('width');
  let height = svg.attr('height');
  let marge = { top: 60, bottom: 60, left: 60, right: 60 };
  let g = svg.append('g')
    .attr('transform', 'translate('+marge.top+','+marge.left+')');


  let colorScale = d3.scaleOrdinal()
    .domain(d3.range(nodes.length))
    .range(d3.schemeCategory10);

  forceSimulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(function(d) {
      return d.id;
    }))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter());

  forceSimulation.nodes(nodes)
    .on('tick', ticked);
  forceSimulation.force('link')
    .links(edges)
    .distance(function(d) {
      return d.value*100;
    });
  forceSimulation.force('center')
    .x(width*0.5)
    .y(height*0.5);

  let self_cycle = [];
  let links = g.append('g')
    .selectAll('line')
    .data(edges)
    .enter()
    .append('line')
    .attr('stroke', function(d, i) {
      return d.color || 'black';
    })
    .attr('stroke-width', 2);
  edges.forEach(function(edge) {
    let s = edge.source;
    let t = edge.target;
    if (s != null && s == t) {
      console.log(s);
      self_cycle.push([s, t]);
    }
  });
  let selfLinks = g.append('g')
    .selectAll('line')
    .data(self_cycle)
    .enter().append('path')
    .attr('stroke', 'black')
    .attr('stroke-width', 1)
    .attr('fill', 'none');
  let linksText = g.append('g')
    .selectAll('text')
    .data(edges)
    .enter()
    .append('text')
    .text(function(d) {
      return d.relation;
    });
  let gs = g.selectAll('.circleText')
    .data(nodes)
    .enter()
    .append('g')
    .attr('transform', function(d, i) {
      let cirX = d.x;
      let cirY = d.y;
      return 'translate('+cirX+','+cirY+')';
    })
    .call(d3.drag()
      .on('start', started)
      .on('drag', dragged)
      .on('end', ended)
    );
  gs.append('circle')
    .attr('r', 5)
    .attr('fill', function(d, i) {
      return 'black';
    });
  gs.append('text')
    .attr('x', -10)
    .attr('y', -20)
    .attr('dy', 10)
    .text(function(d) {
      return d.id;
    });
  function self_cycle_path(s, t) {
    let x1 = s.x;
    let y1 = s.y;
    let x2 = t.x;
    let y2 = t.y;
    let dx = x2 - x1;
    let dy = y2 - y1;
    let dr = Math.sqrt(dx * dx + dy * dy);

    // Defaults for normal edge.
    let drx = dr;
    let dry = dr;
    let xRotation = 0; // degrees
    let largeArc = 0; // 1 or 0
    let sweep = 1; // 1 or 0

    // Self edge.
    if (x1 === x2 && y1 === y2) {
      // Fiddle with this angle to get loop oriented.
      xRotation = -45;

      // Needs to be 1.
      largeArc = 1;

      // Change sweep to change orientation of loop.
      // sweep = 0;

      // Make drx and dry different to get an ellipse
      // instead of a circle.
      drx = 10;
      dry = 20;

      // For whatever reason the arc collapses to a point if the beginning
      // and ending points of the arc are the same, so kludge it.
      x2 = x2 - 1;
      y2 = y2 + 1;
    }

    return 'M' + x1 + ',' + y1 + 'A' + drx + ',' + dry + ' ' + xRotation + ',' + largeArc + ',' + sweep + ' ' + x2 + ',' + y2;
  }
  function ticked() {
    links
      .attr('x1', function(d) {
        return d.source.x;
      })
      .attr('y1', function(d) {
        return d.source.y;
      })
      .attr('x2', function(d) {
        return d.target.x;
      })
      .attr('y2', function(d) {
        return d.target.y;
      });
    selfLinks.attr('d', function(d) {
      return self_cycle_path(d[0], d[1]);
    });
    linksText
      .attr('x', function(d) {
        return (d.source.x+d.target.x)/2;
      })
      .attr('y', function(d) {
        return (d.source.y+d.target.y)/2;
      });

    gs.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  }
  function started(d) {
    if (!d3.event.active)
      forceSimulation.alphaTarget(0.01).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  function ended(d) {
    if (!d3.event.active)
      forceSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

function planarity_test(nodes, edges) {
  if (nodes == null) {
    nodes = [
      { 'id': '0' },
      { 'id': '1' },
      { 'id': '2' },
      { 'id': '3' },
      { 'id': '4' },
    ];
  }
  if (edges == null) {
    edges = [
      { 'source': '0', 'target': '1', 'value': 1 },
      { 'source': '0', 'target': '2', 'value': 1 },
      { 'source': '0', 'target': '3', 'value': 1 },
      { 'source': '0', 'target': '4', 'value': 1 },
      { 'source': '1', 'target': '2', 'value': 1 },
      { 'source': '1', 'target': '3', 'value': 1 },
      { 'source': '1', 'target': '4', 'value': 1 },
      { 'source': '2', 'target': '3', 'value': 1 },
      // { 'source': '2', 'target': '4', 'value': 1 },
      { 'source': '3', 'target': '4', 'value': 1 },
    ];
  }
  let checker = new PlanarityChecker(nodes.length);
  let id_idx = {};
  let idx_id = {};
  for (let v of nodes) {
    id_idx[v.id] = Object.keys(id_idx).length;
    idx_id[id_idx[v.id]] = v.id;
  }
  let n = Object.keys(id_idx).length;
  let m = edges.length;
  for (let e of edges)
    checker.add_edge(id_idx[e.source], id_idx[e.target]);
  let planarity = checker.is_planar();
  console.log(checker);
  console.log('Graph planarity:' + planarity);
  if (3 * n - 6 >= m && planarity && n > 4) {
    checker.get_embedding();
    for (let e of edges) {
      let edge = [id_idx[e.source], id_idx[e.target]];
      if (!checker.adj_list[edge[0]].has(edge[1]))
        [edge[0], edge[1]] = [edge[1], edge[0]];
      let embed_list = checker.embedding_adj_list[edge[1]];
      if (checker.parent[edge[1]] != edge[0]) { // back edge
        let length = 1;
        for (let i = 0; i < embed_list.length; i++) {
          if (JSON.stringify(embed_list[i]) == JSON.stringify(edge)) {
            length = embed_list.length - i - 1;
            break;
          }
        }
        e.value = checker.height[edge[0]] - 1;
        e.color = checker.side[edge] == 1 ? 'red' : 'blue';
      }
      // console.log(e);
    }
  }
  // console.log(checker.adj_list);
  // console.log(checker.embedding_adj_list);
  if (planarity)
    document.getElementById('planarity').innerHTML = 'Planarity: <font color="green"> True </font>';
  else
    document.getElementById('planarity').innerHTML = 'Planarity: <font color="red"> False </font>';
  draw(nodes, edges);
}

function K5() {
  let nodes = [
    { 'id': '0' },
    { 'id': '1' },
    { 'id': '2' },
    { 'id': '3' },
    { 'id': '4' },
  ];
  let edges = [
    { 'source': '0', 'target': '1', 'value': 1 },
    { 'source': '0', 'target': '2', 'value': 1 },
    { 'source': '0', 'target': '3', 'value': 1 },
    { 'source': '0', 'target': '4', 'value': 1 },
    { 'source': '1', 'target': '2', 'value': 1 },
    { 'source': '1', 'target': '3', 'value': 1 },
    { 'source': '1', 'target': '4', 'value': 1 },
    { 'source': '2', 'target': '3', 'value': 1 },
    { 'source': '2', 'target': '4', 'value': 1 },
    { 'source': '3', 'target': '4', 'value': 1 },
  ];
  planarity_test(nodes, edges);
}

function AK5() {
  let nodes = [
    { 'id': '0' },
    { 'id': '1' },
    { 'id': '2' },
    { 'id': '3' },
    { 'id': '4' },
  ];
  let edges = [
    { 'source': '0', 'target': '1', 'value': 1 },
    { 'source': '0', 'target': '2', 'value': 1 },
    { 'source': '0', 'target': '3', 'value': 1 },
    { 'source': '0', 'target': '4', 'value': 1 },
    { 'source': '1', 'target': '2', 'value': 1 },
    { 'source': '1', 'target': '3', 'value': 1 },
    { 'source': '1', 'target': '4', 'value': 1 },
    { 'source': '2', 'target': '3', 'value': 1 },
    // { 'source': '2', 'target': '4', 'value': 1 },
    { 'source': '3', 'target': '4', 'value': 1 },
  ];
  planarity_test(nodes, edges);
}


function K33() {
  let nodes = [
    { 'id': '0' },
    { 'id': '1' },
    { 'id': '2' },
    { 'id': '3' },
    { 'id': '4' },
    { 'id': '5' },
  ];
  let edges = [
    { 'source': '0', 'target': '3', 'value': 1 },
    { 'source': '0', 'target': '4', 'value': 1 },
    { 'source': '0', 'target': '5', 'value': 1 },
    { 'source': '1', 'target': '3', 'value': 1 },
    { 'source': '1', 'target': '4', 'value': 1 },
    { 'source': '1', 'target': '5', 'value': 1 },
    { 'source': '2', 'target': '3', 'value': 1 },
    { 'source': '2', 'target': '4', 'value': 1 },
    { 'source': '2', 'target': '5', 'value': 1 },
  ];
  planarity_test(nodes, edges);
}

function AK33() {
  let nodes = [
    { 'id': '0' },
    { 'id': '1' },
    { 'id': '2' },
    { 'id': '3' },
    { 'id': '4' },
    { 'id': '5' },
  ];
  let edges = [
    { 'source': '0', 'target': '3', 'value': 1 },
    { 'source': '0', 'target': '4', 'value': 1 },
    { 'source': '0', 'target': '5', 'value': 1 },
    { 'source': '1', 'target': '3', 'value': 1 },
    { 'source': '1', 'target': '4', 'value': 1 },
    { 'source': '1', 'target': '5', 'value': 1 },
    { 'source': '2', 'target': '3', 'value': 1 },
    // { 'source': '2', 'target': '4', 'value': 1 },
    { 'source': '2', 'target': '5', 'value': 1 },
  ];
  planarity_test(nodes, edges);
}

function Custom() {
  let edges_str = prompt('Enter edges here, split by ","', '0 1, 0 2, 0 3, 0 4, 2 4, 1 4, 3 1');
  console.log('edges_str:' + edges_str);
  let edges = [];
  let nodes = [];
  let V = new Set();
  for (let e_str of edges_str.split(',')) {
    let u = e_str.trim().split(' ')[0];
    let v = e_str.trim().split(' ')[1];
    // console.log('u:'+u + ' v:'+v);
    if (!V.has(u)) {
      V.add(u);
      nodes.push({ 'id': String(u) });
    }
    if (!V.has(v)) {
      V.add(v);
      nodes.push({ 'id': String(v) });
    }
    edges.push({ 'source': String(u), 'target': String(v), 'value': 1 });
  }
  // console.log(nodes);
  // console.log(edges);
  planarity_test(nodes, edges);
}

planarity_test();
document.getElementById('K5').onclick = function() {
  K5();
};

document.getElementById('K33').onclick = function() {
  K33();
};

document.getElementById('AK5').onclick = function() {
  AK5();
};

document.getElementById('AK33').onclick = function() {
  AK33();
};

document.getElementById('Custom').onclick = function() {
  Custom();
};
