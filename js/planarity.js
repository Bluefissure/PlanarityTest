
class DefaultDict {
  constructor(defaultInit) {
    return new Proxy({}, {
      get: (target, name) => name in target
        ? target[name]
        : (target[name] = typeof defaultInit === 'function'
          ? new defaultInit().valueOf()
          : defaultInit),
    });
  }
}

class Interval {
  constructor(low, high) {
    this.low = low;
    this.high = high;
  }

  empty() {
    return this.low == null && this.high == null;
  }
}

class Conflict {
  constructor(L, R) {
    if (L == null)
      L = new Interval();
    if (R == null)
      R = new Interval();
    this.L = L;
    this.R = R;
  }
}

export class PlanarityChecker {
  constructor(n_vertices) {
    this.vertex_count = n_vertices;
    this.edge_count = 0;
    this.adj_list = Array(...Array(n_vertices)).map(function(x, i) {
      return new Set();
    });
    this.ordered_adj_list = {};
    this.embedding_adj_list = new DefaultDict(Array);
    this.left_ref = {};
    this.right_ref = {};
  }

  length() {
    return this.vertex_count;
  }

  add_edge(v, u) {
    console.assert(v != u && 0 <= v && v < this.vertex_count && 0 <= u && u < this.vertex_count,
        'Add Edge Error: (' + v + ',' + u + ')');
    this.adj_list[v].add(u);
    this.adj_list[u].add(v);
    this.edge_count += 1;
  }

  is_planar() { // Algorithm 1: Left-Right Planarity Algorithm
    if (this.length() < 5)
      return true;
    if (3 * this.length() - 6 < this.edge_count)
      return false;
    this.height = Array(this.length()).fill(-1);
    this.parent = Array(this.length()).fill(-1);
    this.dir_adj_list = Array(...Array(this.length())).map(function(x, i) {
      return new Set();
    });
    this.lowpt = {};
    this.lowpt2 = {};
    this.nesting_depth = {};
    for (let i = 0; i < this.length(); i++) {
      if (this.height[i] == -1)
        this.orient_edges(i, -1, 0);
    }
    this.Stack = [];
    this.lowpt_edge = {};
    this.stack_bottom = {};
    this.ref = {};
    this.side = new DefaultDict(1);
    for (let i = 0; i < this.length(); i++) {
      if (this.height[i] == 0) { // root
        if (!(this.check_planarity(i)))
          return false;
      }
    }
    return true;
  }

  orient_edges(v, p = -1, h = 0) { // Algorithm 2: Phase 1 - DFS orientation and nesting order
    this.height[v] = h;
    this.parent[v] = p;
    this.adj_list[v].delete(p); // orient {p, v} as (p, v)
    for (let to of this.adj_list[v]) {
      if (this.dir_adj_list[to].has(v))
        continue;
      else
        this.dir_adj_list[v].add(to);
      let v_to = [v, to];
      this.lowpt[v_to] = this.height[v];
      this.lowpt2[v_to] = this.height[v];
      if (this.height[to] == -1) { // tree edge
        this.orient_edges(to, v, h + 1);
      } else { // back_edge
        this.lowpt[v_to] = this.height[to];
        this.adj_list[to].delete(v); // orient {v, to} as (v, to)
      }
      this.nesting_depth[v_to] = 2 * this.lowpt[v_to];
      if (this.lowpt2[v_to] < this.height[v]) // chordal
        this.nesting_depth[v_to] += 1;
      if (p != -1) {
        let p_v = [p, v];
        if (this.lowpt[v_to] < this.lowpt[p_v]) {
          this.lowpt2[p_v] = Math.min(this.lowpt[p_v], this.lowpt2[p_v]);
          this.lowpt[p_v] = this.lowpt[v_to];
        } else if (this.lowpt[v_to] > this.lowpt[p_v]) {
          this.lowpt2[p_v] = Math.min(this.lowpt2[p_v], this.lowpt[v_to]);
        } else {
          this.lowpt2[p_v] = Math.min(this.lowpt2[p_v], this.lowpt2[v_to]);
        }
      }
    }
  }

  check_planarity(v) { // Algorithm 3: Phase 2 - Testing for LR partition
    let p_v = [this.parent[v], v];
    let ordered_adj_list = Array.from(this.dir_adj_list[v]).sort((a, b) =>
      this.nesting_depth[[v, a]] - this.nesting_depth[[v, b]]
    );
    for (let to of ordered_adj_list) {
      let v_to = [v, to];
      this.stack_bottom[v_to] = this.Stack[this.Stack.length - 1];
      if (v == this.parent[to]) { // tree edge
        if (!this.check_planarity(to))
          return false;
      } else { // back edge
        this.lowpt_edge[v_to] = v_to;
        this.Stack.push(new Conflict(null, new Interval(v_to, v_to)));
      }
      if (this.lowpt[v_to] < this.height[v]) {
        if (to == ordered_adj_list[0]) {
          this.lowpt_edge[p_v] = this.lowpt_edge[v_to];
        } else {
          if (!this.add_constraints(v_to, p_v))
            return false;
        }
      }
    }
    if (this.parent[v] != -1) {
      let p = this.parent[v];
      // Algorithm 5: Removing back edges ending at parent v
      while (this.Stack.length > 0 &&
          this.lowest(this.Stack[this.Stack.length - 1]) == this.height[p]) {
        let P = this.Stack.pop();
        if (P.L.low != null)
          this.side[P.L.low] = -1;
      }
      if (this.Stack.length > 0) {
        let P = this.Stack.pop();
        // trim left interval
        // console.log('trim interval, p:' + p + ' v:' + v);
        // console.log(P);
        while (P.L.high != null && P.L.high[1] == p)
          P.L.high = this.ref[P.L.high];
        if (P.L.high == null && P.L.low != null) {
          this.ref[P.L.low] = P.R.low;
          this.side[P.L.low] = -1;
          P.L.low = null;
        }
        // trim right interval
        while (P.R.high != null && P.R.high[1] == p)
          P.R.high = this.ref[P.R.high];
        if (P.R.high == null && P.R.low != null) {
          this.ref[P.R.low] = P.L.low;
          this.side[P.R.low] = -1;
          P.R.low = null;
        }
        this.Stack.push(P);
      }

      if (this.lowpt[p_v] < this.height[p]) {
        let H_l = this.Stack[this.Stack.length - 1].L.high;
        let H_r = this.Stack[this.Stack.length - 1].R.high;
        if (H_l != null && (H_r == null || this.lowpt[H_l] > this.lowpt[H_r]))
          this.ref[p_v] = H_l;
        else
          this.ref[p_v] = H_r;
      }
    }
    return true;
  }

  lowest(conflict_pair) {
    if (conflict_pair.L.empty())
      return this.lowpt[conflict_pair.R.low];
    if (conflict_pair.R.empty())
      return this.lowpt[conflict_pair.L.low];
    return Math.min(this.lowpt[conflict_pair.R.low], this.lowpt[conflict_pair.L.low]);
  }

  add_constraints(v_to, p_v) { // Algorithm 4: Adding constraints associated with e_i, e
    let P = new Conflict();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let Q = this.Stack.pop();
      if (!Q.L.empty())
        [Q.L, Q.R] = [Q.R, Q.L];
      if (!Q.L.empty())
        return false;
      if (this.lowpt[Q.R.low] > this.lowpt[p_v]) {
        if (P.R.empty())
          P.R.high = Q.R.high;
        else
          this.ref[P.R.low] = Q.R.high;
        P.R.low = Q.R.low;
      } else {
        this.ref[Q.R.low] = this.lowpt_edge[p_v];
      }
      if (JSON.stringify(this.Stack[this.Stack.length - 1]) ==
          JSON.stringify(this.stack_bottom[v_to]))
        break;
    }
    while (this.conflicting(this.Stack[this.Stack.length - 1].L, v_to) ||
        this.conflicting(this.Stack[this.Stack.length - 1].R, v_to)) {
      let Q = this.Stack.pop();
      if (this.conflicting(Q.R, v_to))
        [Q.L, Q.R] = [Q.R, Q.L];
      if (this.conflicting(Q.R, v_to))
        return false;
      this.ref[P.R.low] = Q.R.high;
      if (Q.R.low != null)
        P.R.low = Q.R.low;
      if (P.L.empty())
        P.L.high = Q.L.high;
      else
        this.ref[P.L.low] = Q.L.high;
      P.L.low = Q.L.low;
    }
    if (!P.L.empty() || !P.R.empty())
      this.Stack.push(P);
    return true;
  }

  conflicting(interval, edge) {
    return !interval.empty() && this.lowpt[interval.high] > this.lowpt[edge];
  }

  get_embedding() {
    for (let e in this.nesting_depth)
      this.nesting_depth[e] = this.nesting_depth[e] * this.sign(e);
    for (let v in this.adj_list) {
      this.ordered_adj_list[v] = Array.from(this.adj_list[v]).sort((a, b) =>
        this.nesting_depth[[v, a]] - this.nesting_depth[[v, b]]
      );
    }
    for (let i = 0; i < this.length(); i++) {
      if (this.height[i] == 0) { // root
        this.assign_embedding(i);
      }
    }
  }

  sign(e) {
    if (this.ref[e] != null) {
      this.side[e] = this.side[e] * this.sign(this.ref[e]);
      this.ref[e] = null;
    }
    return this.side[e];
  }

  assign_embedding(v) { // Algorithm 6: Phase 3 - Embedding
    for (let to of this.ordered_adj_list[v]) {
      let v_to = [v, to];
      if (this.parent[to] == v) { // tree edge
        // unnecessary
        // let index = this.embedding_adj_list[v].indexOf(to);
        // if (index > -1)
        //   this.embedding_adj_list[v].splice(index, 1);
        this.embedding_adj_list[v].unshift(v_to);
        this.left_ref[v] = v_to;
        this.right_ref[v] = v_to;
        this.assign_embedding(to);
      } else { // back edge
        if (this.side[v_to] == 1) {
          let index = this.embedding_adj_list[to].indexOf(this.right_ref[to]);
          this.embedding_adj_list[to].splice(index + 1, 0, v_to);
        } else {
          let index = this.embedding_adj_list[to].indexOf(this.left_ref[to]);
          this.embedding_adj_list[to].splice(index, 0, v_to);
          this.left_ref[to] = v_to;
        }
      }
    }
  }
}
