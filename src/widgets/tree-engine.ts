export interface TreeNode {
  id: number;
  leaf: boolean;
  keys: number[];
  children: TreeNode[];
  next?: TreeNode;
}
export interface TreeStep {
  root: TreeNode;
  kind: "visit" | "insert" | "delete" | "split" | "borrow" | "merge" | "done";
  message: string;
  active: number[];
}
export class BPlusTree {
  root: TreeNode = { id: 0, leaf: true, keys: [], children: [] };
  private nextId = 1;
  private steps: TreeStep[] = [];
  private node(leaf: boolean): TreeNode {
    return { id: this.nextId++, leaf, keys: [], children: [] };
  }
  private minimum(node: TreeNode): number {
    return node.leaf ? node.keys[0] : this.minimum(node.children[0]);
  }
  private refresh(node = this.root): void {
    if (!node.leaf) {
      node.children.forEach((child) => this.refresh(child));
      node.keys = node.children.slice(1).map((child) => this.minimum(child));
    }
  }
  private record(
    kind: TreeStep["kind"],
    message: string,
    ...active: number[]
  ): void {
    this.refresh();
    this.steps.push({
      kind,
      message,
      active,
      root: structuredClone(this.root),
    });
  }
  private path(key: number): TreeNode[] {
    const nodes = [this.root];
    let node = this.root;
    while (!node.leaf) {
      let i = 0;
      while (i < node.keys.length && key >= node.keys[i]) i++;
      node = node.children[i];
      nodes.push(node);
    }
    return nodes;
  }
  insert(key: number): TreeStep[] {
    this.steps = [];
    if (!Number.isFinite(key)) return [];
    const path = this.path(key);
    const leaf = path[path.length - 1];
    this.record(
      "visit",
      `Follow separators to the leaf for ${key}.`,
      ...path.map((n) => n.id),
    );
    if (leaf.keys.includes(key)) {
      this.record(
        "done",
        `${key} already exists; this index stores unique keys.`,
        leaf.id,
      );
      return this.steps;
    }
    leaf.keys.push(key);
    leaf.keys.sort((a, b) => a - b);
    this.record("insert", `Insert ${key} into its sorted leaf.`, leaf.id);
    for (let level = path.length - 1; level >= 0; level--) {
      const current = path[level];
      if (
        current.leaf ? current.keys.length <= 3 : current.children.length <= 4
      )
        break;
      const right = this.node(current.leaf);
      if (current.leaf) {
        right.keys = current.keys.splice(2);
        right.next = current.next;
        current.next = right;
      } else right.children = current.children.splice(3);
      if (level === 0) {
        const root = this.node(false);
        root.children = [current, right];
        this.root = root;
      } else {
        const parent = path[level - 1];
        parent.children.splice(parent.children.indexOf(current) + 1, 0, right);
      }
      this.record(
        "split",
        current.leaf
          ? `Leaf overflow: split into two leaves and copy ${right.keys[0]} up.`
          : "Internal overflow: split child pointers and promote the separating key.",
        current.id,
        right.id,
      );
    }
    this.record(
      "done",
      `${key} inserted. Every root-to-leaf path has equal depth.`,
      leaf.id,
    );
    return this.steps;
  }
  delete(key: number): TreeStep[] {
    this.steps = [];
    const path = this.path(key),
      leaf = path[path.length - 1];
    this.record(
      "visit",
      `Find the leaf containing ${key}.`,
      ...path.map((n) => n.id),
    );
    const index = leaf.keys.indexOf(key);
    if (index < 0) {
      this.record("done", `${key} is not present.`);
      return this.steps;
    }
    leaf.keys.splice(index, 1);
    this.record("delete", `Remove ${key} from its leaf.`, leaf.id);
    for (let level = path.length - 1; level > 0; level--) {
      const current = path[level],
        parent = path[level - 1];
      const count = (node: TreeNode) =>
        node.leaf ? node.keys.length : node.children.length;
      if (count(current) >= 2) break;
      const at = parent.children.indexOf(current),
        left = parent.children[at - 1],
        right = parent.children[at + 1];
      if (left && count(left) > 2) {
        if (current.leaf) current.keys.unshift(left.keys.pop()!);
        else current.children.unshift(left.children.pop()!);
        this.record(
          "borrow",
          "Underflow: borrow the largest entry from the left sibling; update the separator.",
          left.id,
          current.id,
        );
        break;
      }
      if (right && count(right) > 2) {
        if (current.leaf) current.keys.push(right.keys.shift()!);
        else current.children.push(right.children.shift()!);
        this.record(
          "borrow",
          "Underflow: borrow the smallest entry from the right sibling; update the separator.",
          current.id,
          right.id,
        );
        break;
      }
      const target = left ?? current,
        source = left ? current : right;
      if (current.leaf) {
        target.keys.push(...source.keys);
        target.next = source.next;
      } else target.children.push(...source.children);
      parent.children.splice(parent.children.indexOf(source), 1);
      if (parent === this.root && parent.children.length === 1)
        this.root = parent.children[0];
      this.record(
        "merge",
        "Underflow: merge adjacent siblings and remove one parent pointer.",
        target.id,
      );
    }
    this.record(
      "done",
      `${key} deleted. Separators and leaf links are updated.`,
    );
    return this.steps;
  }
  values(): number[] {
    let leaf = this.root;
    while (!leaf.leaf) leaf = leaf.children[0];
    const values: number[] = [];
    while (leaf) {
      values.push(...leaf.keys);
      if (!leaf.next) break;
      leaf = leaf.next;
    }
    return values;
  }
}
export function validateTree(root: TreeNode): string[] {
  const errors: string[] = [],
    leaves: TreeNode[] = [],
    depths = new Set<number>();
  const visit = (node: TreeNode, depth: number): number[] => {
    if (node.keys.some((key, i) => i > 0 && key <= node.keys[i - 1]))
      errors.push("Keys must be strictly sorted.");
    if (node.keys.length > 3) errors.push("Node overflow.");
    if (node.leaf) {
      if (node !== root && node.keys.length < 2) errors.push("Leaf underflow.");
      leaves.push(node);
      depths.add(depth);
      return node.keys;
    }
    if (
      node.children.length !== node.keys.length + 1 ||
      node.children.length < 2
    )
      errors.push("Invalid child count.");
    const values = node.children.map((child) => visit(child, depth + 1));
    if (node.keys.some((key, i) => key !== values[i + 1]?.[0]))
      errors.push("Invalid separator.");
    return values.flat();
  };
  const values = visit(root, 0);
  if (values.some((key, i) => i > 0 && key <= values[i - 1]))
    errors.push("Invalid key range.");
  if (depths.size > 1) errors.push("Leaves have unequal depth.");
  if (leaves.some((leaf, i) => leaf.next !== leaves[i + 1]))
    errors.push("Broken leaf chain.");
  return errors;
}
