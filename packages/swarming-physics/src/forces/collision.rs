// ============================================================================
// Collision force — prevents node overlap
//
// Uses a simple spatial hash for O(n) expected time collision detection.
// For each pair of overlapping nodes, pushes them apart proportionally.
// ============================================================================

/// Apply collision forces between nodes.
/// `radii` is the collision radius for each node.
/// `padding` is added to each radius.
pub fn apply_collision(
    x: &mut [f64],
    y: &mut [f64],
    z: &mut [f64],
    radii: &[f64],
    padding: f64,
    strength: f64,
) {
    let n = x.len();
    if n < 2 {
        return;
    }

    // For small node counts, use brute force O(n²)
    if n <= 500 {
        apply_collision_brute(x, y, z, radii, padding, strength);
        return;
    }

    // For larger counts, use spatial hash
    apply_collision_hash(x, y, z, radii, padding, strength);
}

fn apply_collision_brute(
    x: &mut [f64],
    y: &mut [f64],
    z: &mut [f64],
    radii: &[f64],
    padding: f64,
    strength: f64,
) {
    let n = x.len();
    for i in 0..n {
        let ri = radii[i] + padding;
        for j in (i + 1)..n {
            let rj = radii[j] + padding;
            let min_dist = ri + rj;

            let dx = x[j] - x[i];
            let dy = y[j] - y[i];
            let dz = z[j] - z[i];
            let dist_sq = dx * dx + dy * dy + dz * dz;

            if dist_sq < min_dist * min_dist && dist_sq > 1e-12 {
                let dist = dist_sq.sqrt();
                let overlap = (min_dist - dist) * 0.5 * strength;
                let nx = dx / dist * overlap;
                let ny = dy / dist * overlap;
                let nz = dz / dist * overlap;

                x[i] -= nx;
                y[i] -= ny;
                z[i] -= nz;
                x[j] += nx;
                y[j] += ny;
                z[j] += nz;
            }
        }
    }
}

fn apply_collision_hash(
    x: &mut [f64],
    y: &mut [f64],
    z: &mut [f64],
    radii: &[f64],
    padding: f64,
    strength: f64,
) {
    use std::collections::HashMap;

    // Find max radius for cell size
    let max_r = radii.iter().copied().fold(0.0_f64, f64::max) + padding;
    let cell_size = max_r * 2.0;
    if cell_size < 1e-12 {
        return;
    }
    let inv_cell = 1.0 / cell_size;

    // Build spatial hash: cell -> list of node indices
    let n = x.len();
    let mut grid: HashMap<(i64, i64, i64), Vec<usize>> = HashMap::with_capacity(n);

    for i in 0..n {
        let cx = (x[i] * inv_cell).floor() as i64;
        let cy = (y[i] * inv_cell).floor() as i64;
        let cz = (z[i] * inv_cell).floor() as i64;
        grid.entry((cx, cy, cz)).or_default().push(i);
    }

    // Collect displacement vectors (to avoid aliasing issues)
    let mut disp_x = vec![0.0f64; n];
    let mut disp_y = vec![0.0f64; n];
    let mut disp_z = vec![0.0f64; n];

    for i in 0..n {
        let ri = radii[i] + padding;
        let cx = (x[i] * inv_cell).floor() as i64;
        let cy = (y[i] * inv_cell).floor() as i64;
        let cz = (z[i] * inv_cell).floor() as i64;

        // Check neighboring cells
        for dx in -1..=1_i64 {
            for dy in -1..=1_i64 {
                for dz in -1..=1_i64 {
                    let key = (cx + dx, cy + dy, cz + dz);
                    if let Some(cell) = grid.get(&key) {
                        for &j in cell {
                            if j <= i {
                                continue;
                            }
                            let rj = radii[j] + padding;
                            let min_dist = ri + rj;

                            let ddx = x[j] - x[i];
                            let ddy = y[j] - y[i];
                            let ddz = z[j] - z[i];
                            let dist_sq = ddx * ddx + ddy * ddy + ddz * ddz;

                            if dist_sq < min_dist * min_dist && dist_sq > 1e-12 {
                                let dist = dist_sq.sqrt();
                                let overlap = (min_dist - dist) * 0.5 * strength;
                                let nx = ddx / dist * overlap;
                                let ny = ddy / dist * overlap;
                                let nz = ddz / dist * overlap;

                                disp_x[i] -= nx;
                                disp_y[i] -= ny;
                                disp_z[i] -= nz;
                                disp_x[j] += nx;
                                disp_y[j] += ny;
                                disp_z[j] += nz;
                            }
                        }
                    }
                }
            }
        }
    }

    // Apply displacements
    for i in 0..n {
        x[i] += disp_x[i];
        y[i] += disp_y[i];
        z[i] += disp_z[i];
    }
}
