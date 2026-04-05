// ============================================================================
// Link (spring) force — Hooke's law
// ============================================================================

/// An edge with resolved source/target indices.
pub struct LinkEdge {
    pub source: usize,
    pub target: usize,
    pub distance: f64,
    pub strength: f64,
}

/// Apply spring forces along edges. Modifies velocity directly (like d3-force).
pub fn apply_links(
    edges: &[LinkEdge],
    x: &[f64],
    y: &[f64],
    z: &[f64],
    vx: &mut [f64],
    vy: &mut [f64],
    vz: &mut [f64],
    alpha: f64,
) {
    for edge in edges {
        let si = edge.source;
        let ti = edge.target;

        let dx = x[ti] - x[si];
        let dy = y[ti] - y[si];
        let dz = z[ti] - z[si];

        let dist_sq = dx * dx + dy * dy + dz * dz;
        if dist_sq < 1e-12 {
            continue;
        }
        let dist = dist_sq.sqrt();

        // Hooke's law: F = strength * (dist - target_dist) / dist
        let force = (dist - edge.distance) / dist * edge.strength * alpha;

        let fx = dx * force;
        let fy = dy * force;
        let fz = dz * force;

        // Apply equal and opposite forces
        vx[si] += fx;
        vy[si] += fy;
        vz[si] += fz;
        vx[ti] -= fx;
        vy[ti] -= fy;
        vz[ti] -= fz;
    }
}
