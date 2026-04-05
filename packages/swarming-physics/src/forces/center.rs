// ============================================================================
// Center (gravity) force — pulls all nodes toward origin
// ============================================================================

/// Apply a centering force that pulls nodes toward (0, 0, 0).
pub fn apply_center(
    x: &mut [f64],
    y: &mut [f64],
    z: &mut [f64],
    strength: f64,
) {
    let n = x.len();
    if n == 0 {
        return;
    }

    // Compute center of mass
    let mut cx = 0.0;
    let mut cy = 0.0;
    let mut cz = 0.0;
    for i in 0..n {
        cx += x[i];
        cy += y[i];
        cz += z[i];
    }
    cx /= n as f64;
    cy /= n as f64;
    cz /= n as f64;

    // Shift all nodes toward origin
    let sx = cx * strength;
    let sy = cy * strength;
    let sz = cz * strength;
    for i in 0..n {
        x[i] -= sx;
        y[i] -= sy;
        z[i] -= sz;
    }
}
