// ============================================================================
// Octree for Barnes-Hut approximation
//
// Recursively subdivides 3D space into 8 octants. Each leaf holds a single
// body; internal nodes store the center of mass and total charge of their
// subtree. Queries use the theta criterion to decide when a cluster is
// far enough to treat as a single body.
// ============================================================================

/// A 3D vector.
#[derive(Clone, Copy, Default)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Vec3 { x, y, z }
    }
}

/// A body in the simulation (maps to a node).
#[derive(Clone)]
pub struct Body {
    pub pos: Vec3,
    pub charge: f64,
    pub index: usize,
}

/// Axis-aligned bounding box (cube).
#[derive(Clone)]
struct AABB {
    cx: f64,
    cy: f64,
    cz: f64,
    half: f64,
}

impl AABB {
    fn octant(&self, p: &Vec3) -> usize {
        let mut idx = 0;
        if p.x > self.cx { idx |= 1; }
        if p.y > self.cy { idx |= 2; }
        if p.z > self.cz { idx |= 4; }
        idx
    }

    fn child(&self, octant: usize) -> AABB {
        let q = self.half * 0.5;
        AABB {
            cx: self.cx + if octant & 1 != 0 { q } else { -q },
            cy: self.cy + if octant & 2 != 0 { q } else { -q },
            cz: self.cz + if octant & 4 != 0 { q } else { -q },
            half: q,
        }
    }
}

/// A node in the octree. Uses a flat arena for cache-friendly traversal.
struct OctreeArena {
    /// For each node: [com_x, com_y, com_z, total_charge, count, is_leaf, body_index, child_start]
    /// child_start: index into `nodes` where 8 children begin (0 if leaf/empty)
    nodes: Vec<ArenaNode>,
}

#[derive(Clone)]
struct ArenaNode {
    com_x: f64,
    com_y: f64,
    com_z: f64,
    total_charge: f64,
    count: u32,
    body_index: u32, // u32::MAX means no single body
    child_start: u32, // 0 means no children
}

impl Default for ArenaNode {
    fn default() -> Self {
        ArenaNode {
            com_x: 0.0, com_y: 0.0, com_z: 0.0,
            total_charge: 0.0, count: 0,
            body_index: u32::MAX,
            child_start: 0,
        }
    }
}

/// Barnes-Hut octree for efficient O(n log n) force computation.
pub struct Octree {
    arena: Vec<ArenaNode>,
    bounds: AABB,
}

impl Octree {
    /// Build an octree from a set of bodies.
    pub fn build(bodies: &[Body]) -> Self {
        if bodies.is_empty() {
            return Octree {
                arena: vec![ArenaNode::default()],
                bounds: AABB { cx: 0.0, cy: 0.0, cz: 0.0, half: 1.0 },
            };
        }

        // Compute bounding box
        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut min_z = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;
        let mut max_z = f64::MIN;

        for b in bodies {
            min_x = min_x.min(b.pos.x);
            min_y = min_y.min(b.pos.y);
            min_z = min_z.min(b.pos.z);
            max_x = max_x.max(b.pos.x);
            max_y = max_y.max(b.pos.y);
            max_z = max_z.max(b.pos.z);
        }

        let half = ((max_x - min_x).max(max_y - min_y).max(max_z - min_z)) * 0.5 + 1.0;
        let bounds = AABB {
            cx: (min_x + max_x) * 0.5,
            cy: (min_y + max_y) * 0.5,
            cz: (min_z + max_z) * 0.5,
            half,
        };

        // Pre-allocate arena with a reasonable capacity
        let mut arena = Vec::with_capacity(bodies.len() * 2);
        arena.push(ArenaNode::default()); // Root node at index 0

        for body in bodies {
            Self::insert(&mut arena, 0, body, &bounds, 0);
        }

        Octree { arena, bounds }
    }

    fn insert(arena: &mut Vec<ArenaNode>, node_idx: usize, body: &Body, bounds: &AABB, depth: usize) {
        if depth > 50 {
            return; // Prevent infinite recursion for coincident points
        }

        let node = &arena[node_idx];

        if node.count == 0 {
            // Empty node — place body here as leaf
            arena[node_idx] = ArenaNode {
                com_x: body.pos.x,
                com_y: body.pos.y,
                com_z: body.pos.z,
                total_charge: body.charge,
                count: 1,
                body_index: body.index as u32,
                child_start: 0,
            };
        } else if node.child_start == 0 {
            // Leaf node — split into internal node with children
            let child_start = arena.len() as u32;
            // Allocate 8 empty children
            for _ in 0..8 {
                arena.push(ArenaNode::default());
            }

            // Re-insert the existing body into the appropriate child
            let existing_idx = arena[node_idx].body_index;
            let existing_pos = Vec3::new(
                arena[node_idx].com_x,
                arena[node_idx].com_y,
                arena[node_idx].com_z,
            );
            let existing_charge = arena[node_idx].total_charge;

            arena[node_idx].child_start = child_start;
            arena[node_idx].body_index = u32::MAX;

            let existing_body = Body {
                pos: existing_pos,
                charge: existing_charge,
                index: existing_idx as usize,
            };

            let oct_e = bounds.octant(&existing_body.pos);
            Self::insert(arena, child_start as usize + oct_e, &existing_body, &bounds.child(oct_e), depth + 1);

            // Insert the new body
            let oct_n = bounds.octant(&body.pos);
            Self::insert(arena, child_start as usize + oct_n, body, &bounds.child(oct_n), depth + 1);

            // Update COM and charge
            let old_charge = existing_charge;
            let new_total = old_charge + body.charge;
            let w_old = old_charge.abs();
            let w_new = body.charge.abs();
            let w_total = w_old + w_new;
            if w_total > 1e-12 {
                arena[node_idx].com_x = (existing_pos.x * w_old + body.pos.x * w_new) / w_total;
                arena[node_idx].com_y = (existing_pos.y * w_old + body.pos.y * w_new) / w_total;
                arena[node_idx].com_z = (existing_pos.z * w_old + body.pos.z * w_new) / w_total;
            }
            arena[node_idx].total_charge = new_total;
            arena[node_idx].count = 2;
        } else {
            // Internal node — recurse into appropriate child
            let child_start = arena[node_idx].child_start as usize;
            let oct = bounds.octant(&body.pos);
            Self::insert(arena, child_start + oct, body, &bounds.child(oct), depth + 1);

            // Update COM and charge
            let old_count = arena[node_idx].count as f64;
            let old_charge = arena[node_idx].total_charge;
            let new_total = old_charge + body.charge;
            let w_old = old_charge.abs();
            let w_new = body.charge.abs();
            let w_total = w_old + w_new;
            if w_total > 1e-12 {
                arena[node_idx].com_x = (arena[node_idx].com_x * w_old + body.pos.x * w_new) / w_total;
                arena[node_idx].com_y = (arena[node_idx].com_y * w_old + body.pos.y * w_new) / w_total;
                arena[node_idx].com_z = (arena[node_idx].com_z * w_old + body.pos.z * w_new) / w_total;
            } else {
                let new_count = old_count + 1.0;
                arena[node_idx].com_x = (arena[node_idx].com_x * old_count + body.pos.x) / new_count;
                arena[node_idx].com_y = (arena[node_idx].com_y * old_count + body.pos.y) / new_count;
                arena[node_idx].com_z = (arena[node_idx].com_z * old_count + body.pos.z) / new_count;
            }
            arena[node_idx].total_charge = new_total;
            arena[node_idx].count += 1;
        }
    }

    /// Compute the force on a body at position `pos` using Barnes-Hut approximation.
    /// Returns (fx, fy, fz).
    pub fn compute_force(&self, pos: &Vec3, body_index: usize, theta: f64) -> Vec3 {
        let mut force = Vec3::default();
        if !self.arena.is_empty() {
            self.walk_force(0, &self.bounds, pos, body_index, theta * theta, &mut force);
        }
        force
    }

    fn walk_force(
        &self,
        node_idx: usize,
        bounds: &AABB,
        pos: &Vec3,
        body_index: usize,
        theta_sq: f64,
        force: &mut Vec3,
    ) {
        let node = &self.arena[node_idx];

        if node.count == 0 {
            return; // Empty
        }

        let dx = node.com_x - pos.x;
        let dy = node.com_y - pos.y;
        let dz = node.com_z - pos.z;
        let dist_sq = dx * dx + dy * dy + dz * dz;

        if node.child_start == 0 {
            // Leaf node
            if node.body_index as usize == body_index {
                return; // Skip self
            }
            if dist_sq < 0.01 {
                return; // Too close
            }
            let dist = dist_sq.sqrt();
            let f = node.total_charge / (dist_sq * dist);
            force.x += dx * f;
            force.y += dy * f;
            force.z += dz * f;
            return;
        }

        // Internal node — check Barnes-Hut criterion
        let size = bounds.half * 2.0;
        if size * size < theta_sq * dist_sq {
            // Far enough — treat as single body
            if dist_sq < 0.01 {
                return;
            }
            let dist = dist_sq.sqrt();
            let f = node.total_charge / (dist_sq * dist);
            force.x += dx * f;
            force.y += dy * f;
            force.z += dz * f;
        } else {
            // Recurse into children
            let child_start = node.child_start as usize;
            for i in 0..8 {
                self.walk_force(child_start + i, &bounds.child(i), pos, body_index, theta_sq, force);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_octree() {
        let tree = Octree::build(&[]);
        let force = tree.compute_force(&Vec3::new(0.0, 0.0, 0.0), 0, 0.9);
        assert_eq!(force.x, 0.0);
    }

    #[test]
    fn test_two_bodies_repel() {
        let bodies = vec![
            Body { pos: Vec3::new(0.0, 0.0, 0.0), charge: -100.0, index: 0 },
            Body { pos: Vec3::new(10.0, 0.0, 0.0), charge: -100.0, index: 1 },
        ];
        let tree = Octree::build(&bodies);
        let force = tree.compute_force(&Vec3::new(0.0, 0.0, 0.0), 0, 0.9);
        // Body 1 is at +10x with charge -100. Force direction toward body 1 is +x,
        // but charge is negative so force is in -x direction (repulsion).
        assert!(force.x < 0.0, "Expected negative x force (repulsion), got {}", force.x);
    }

    #[test]
    fn test_many_bodies() {
        let mut bodies = Vec::new();
        for i in 0..100 {
            bodies.push(Body {
                pos: Vec3::new(
                    (i as f64 * 1.7).cos() * 10.0,
                    (i as f64 * 2.3).sin() * 10.0,
                    (i as f64 * 0.7).cos() * 10.0,
                ),
                charge: -50.0,
                index: i,
            });
        }
        let tree = Octree::build(&bodies);
        // Should not panic and should produce finite forces
        let force = tree.compute_force(&bodies[0].pos, 0, 0.9);
        assert!(force.x.is_finite());
        assert!(force.y.is_finite());
        assert!(force.z.is_finite());
    }
}
