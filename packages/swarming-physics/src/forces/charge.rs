// ============================================================================
// Charge (repulsion) force — Barnes-Hut O(n log n)
// ============================================================================

use crate::spatial::{Body, Octree, Vec3};

/// Node data needed for charge computation.
pub struct ChargeNode {
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub charge: f64, // Negative = repulsion (matches d3-force convention)
}

/// Apply charge forces to all nodes using Barnes-Hut approximation.
/// `alpha` scales the force. Writes force deltas into `fx`, `fy`, `fz` slices.
pub fn apply_charge(
    nodes: &[ChargeNode],
    theta: f64,
    alpha: f64,
    fx: &mut [f64],
    fy: &mut [f64],
    fz: &mut [f64],
) {
    if nodes.is_empty() {
        return;
    }

    // Build octree from current positions
    let bodies: Vec<Body> = nodes
        .iter()
        .enumerate()
        .map(|(i, n)| Body {
            pos: Vec3::new(n.x, n.y, n.z),
            charge: n.charge,
            index: i,
        })
        .collect();

    let tree = Octree::build(&bodies);

    // Compute force for each node
    for (i, body) in bodies.iter().enumerate() {
        let force = tree.compute_force(&body.pos, i, theta);
        fx[i] += force.x * alpha;
        fy[i] += force.y * alpha;
        fz[i] += force.z * alpha;
    }
}
