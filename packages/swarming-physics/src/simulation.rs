// ============================================================================
// Simulation — orchestrates all forces each tick
// ============================================================================

use std::collections::HashMap;

use crate::forces::{center, charge, collision, link};
use crate::SimConfig;

/// Internal node representation.
#[derive(Clone)]
pub struct Node {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub z: f64,
    pub vx: f64,
    pub vy: f64,
    pub vz: f64,
    pub node_type: u8, // 0 = hub, 1 = agent
    pub radius: f64,
}

/// Internal edge representation (stores indices into the node array).
#[derive(Clone)]
pub struct Edge {
    pub source_idx: usize,
    pub target_idx: usize,
    pub source_id: String,
    pub target_id: String,
}

/// Mouse repulsion force parameters.
struct MouseRepulsion {
    x: f64,
    y: f64,
    z: f64,
    strength: f64,
    radius: f64,
}

/// The core simulation state.
pub struct SimulationInner {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub config: SimConfig,
    pub alpha: f64,

    /// Maps node ID -> index in `nodes` vec.
    id_to_index: HashMap<String, usize>,
    /// Insertion-order IDs for stable position output.
    insertion_order: Vec<String>,

    mouse: Option<MouseRepulsion>,
}

impl SimulationInner {
    pub fn new(config: SimConfig) -> Self {
        SimulationInner {
            nodes: Vec::new(),
            edges: Vec::new(),
            alpha: 1.0,
            id_to_index: HashMap::new(),
            insertion_order: Vec::new(),
            mouse: None,
            config,
        }
    }

    pub fn add_node(&mut self, id: &str, x: f64, y: f64, z: f64, node_type: u8, radius: f64) {
        if self.id_to_index.contains_key(id) {
            // Update existing node position
            let idx = self.id_to_index[id];
            self.nodes[idx].x = x;
            self.nodes[idx].y = y;
            self.nodes[idx].z = z;
            self.nodes[idx].radius = radius;
            self.nodes[idx].node_type = node_type;
            return;
        }

        let idx = self.nodes.len();
        self.nodes.push(Node {
            id: id.to_string(),
            x, y, z,
            vx: 0.0, vy: 0.0, vz: 0.0,
            node_type,
            radius,
        });
        self.id_to_index.insert(id.to_string(), idx);
        self.insertion_order.push(id.to_string());
    }

    pub fn add_edge(&mut self, source: &str, target: &str) {
        let si = match self.id_to_index.get(source) {
            Some(&i) => i,
            None => return,
        };
        let ti = match self.id_to_index.get(target) {
            Some(&i) => i,
            None => return,
        };

        // Check for duplicate edge
        for e in &self.edges {
            if e.source_idx == si && e.target_idx == ti {
                return;
            }
        }

        self.edges.push(Edge {
            source_idx: si,
            target_idx: ti,
            source_id: source.to_string(),
            target_id: target.to_string(),
        });
    }

    pub fn remove_node(&mut self, id: &str) {
        let idx = match self.id_to_index.remove(id) {
            Some(i) => i,
            None => return,
        };

        // Remove edges referencing this node
        self.edges.retain(|e| e.source_idx != idx && e.target_idx != idx);

        // Remove node using swap_remove for O(1)
        let last = self.nodes.len() - 1;
        if idx != last {
            let moved_id = self.nodes[last].id.clone();
            self.nodes.swap(idx, last);
            self.id_to_index.insert(moved_id, idx);

            // Fix edge indices that pointed to the last node
            for e in &mut self.edges {
                if e.source_idx == last { e.source_idx = idx; }
                if e.target_idx == last { e.target_idx = idx; }
            }
        }
        self.nodes.pop();
        self.insertion_order.retain(|s| s != id);
    }

    pub fn remove_edge(&mut self, source: &str, target: &str) {
        let si = match self.id_to_index.get(source) {
            Some(&i) => i,
            None => return,
        };
        let ti = match self.id_to_index.get(target) {
            Some(&i) => i,
            None => return,
        };
        self.edges.retain(|e| !(e.source_idx == si && e.target_idx == ti));
    }

    pub fn clear(&mut self) {
        self.nodes.clear();
        self.edges.clear();
        self.id_to_index.clear();
        self.insertion_order.clear();
        self.alpha = 1.0;
    }

    pub fn set_mouse_repulsion(&mut self, x: f64, y: f64, z: f64, strength: f64, radius: f64) {
        if strength.abs() < 1e-12 {
            self.mouse = None;
        } else {
            self.mouse = Some(MouseRepulsion { x, y, z, strength, radius });
        }
    }

    /// Advance the simulation by one tick. Returns flat position array.
    pub fn tick(&mut self) -> Vec<f64> {
        let n = self.nodes.len();
        if n == 0 {
            return Vec::new();
        }

        // Alpha decay
        self.alpha += (0.001 - self.alpha) * self.config.alpha_decay;
        if self.alpha < 1e-6 {
            return self.get_positions();
        }

        // === 1. Charge force (Barnes-Hut) ===
        let charge_nodes: Vec<charge::ChargeNode> = self.nodes.iter().map(|n| {
            charge::ChargeNode {
                x: n.x,
                y: n.y,
                z: n.z,
                charge: if n.node_type == 0 {
                    self.config.charge_strength
                } else {
                    self.config.agent_charge_strength
                },
            }
        }).collect();

        let mut fx = vec![0.0; n];
        let mut fy = vec![0.0; n];
        let mut fz = vec![0.0; n];

        charge::apply_charge(
            &charge_nodes,
            self.config.theta,
            self.alpha,
            &mut fx, &mut fy, &mut fz,
        );

        // Apply charge forces to velocities
        for i in 0..n {
            self.nodes[i].vx += fx[i];
            self.nodes[i].vy += fy[i];
            self.nodes[i].vz += fz[i];
        }

        // === 2. Link (spring) force ===
        {
            let px: Vec<f64> = self.nodes.iter().map(|n| n.x).collect();
            let py: Vec<f64> = self.nodes.iter().map(|n| n.y).collect();
            let pz: Vec<f64> = self.nodes.iter().map(|n| n.z).collect();
            let mut vx: Vec<f64> = self.nodes.iter().map(|n| n.vx).collect();
            let mut vy: Vec<f64> = self.nodes.iter().map(|n| n.vy).collect();
            let mut vz: Vec<f64> = self.nodes.iter().map(|n| n.vz).collect();

            let link_edges: Vec<link::LinkEdge> = self.edges.iter().map(|e| {
                let s_type = self.nodes[e.source_idx].node_type;
                let t_type = self.nodes[e.target_idx].node_type;
                let is_hub_hub = s_type == 0 && t_type == 0;
                link::LinkEdge {
                    source: e.source_idx,
                    target: e.target_idx,
                    distance: if is_hub_hub {
                        self.config.link_distance
                    } else {
                        self.config.agent_link_distance
                    },
                    strength: if is_hub_hub {
                        self.config.link_strength
                    } else {
                        self.config.agent_link_strength
                    },
                }
            }).collect();

            link::apply_links(&link_edges, &px, &py, &pz, &mut vx, &mut vy, &mut vz, self.alpha);

            for i in 0..n {
                self.nodes[i].vx = vx[i];
                self.nodes[i].vy = vy[i];
                self.nodes[i].vz = vz[i];
            }
        }

        // === 3. Mouse repulsion ===
        if let Some(ref mouse) = self.mouse {
            let r_sq = mouse.radius * mouse.radius;
            for node in &mut self.nodes {
                let dx = node.x - mouse.x;
                let dy = node.y - mouse.y;
                let dz = node.z - mouse.z;
                let dist_sq = dx * dx + dy * dy + dz * dz;
                if dist_sq < r_sq && dist_sq > 1e-6 {
                    let dist = dist_sq.sqrt();
                    let force = mouse.strength * (1.0 - dist / mouse.radius) * self.alpha;
                    let f = force / dist;
                    node.vx += dx * f;
                    node.vy += dy * f;
                    node.vz += dz * f;
                }
            }
        }

        // === 4. Velocity decay + position update ===
        let decay = 1.0 - self.config.velocity_decay;
        for node in &mut self.nodes {
            node.vx *= decay;
            node.vy *= decay;
            node.vz *= decay;
            node.x += node.vx;
            node.y += node.vy;
            node.z += node.vz;
        }

        // === 5. Center force ===
        {
            let mut px: Vec<f64> = self.nodes.iter().map(|n| n.x).collect();
            let mut py: Vec<f64> = self.nodes.iter().map(|n| n.y).collect();
            let mut pz: Vec<f64> = self.nodes.iter().map(|n| n.z).collect();
            center::apply_center(&mut px, &mut py, &mut pz, self.config.center_pull);
            for i in 0..n {
                self.nodes[i].x = px[i];
                self.nodes[i].y = py[i];
                self.nodes[i].z = pz[i];
            }
        }

        // === 6. Collision force ===
        {
            let mut px: Vec<f64> = self.nodes.iter().map(|n| n.x).collect();
            let mut py: Vec<f64> = self.nodes.iter().map(|n| n.y).collect();
            let mut pz: Vec<f64> = self.nodes.iter().map(|n| n.z).collect();
            let radii: Vec<f64> = self.nodes.iter().map(|n| n.radius).collect();
            collision::apply_collision(
                &mut px, &mut py, &mut pz,
                &radii,
                self.config.collision_radius,
                self.config.collision_strength,
            );
            for i in 0..n {
                self.nodes[i].x = px[i];
                self.nodes[i].y = py[i];
                self.nodes[i].z = pz[i];
            }
        }

        self.get_positions()
    }

    /// Advance N ticks, returning only the final positions.
    pub fn tick_n(&mut self, n: u32) -> Vec<f64> {
        for _ in 0..n.saturating_sub(1) {
            let node_count = self.nodes.len();
            if node_count == 0 { return Vec::new(); }
            // Run tick logic without collecting positions
            self.tick_internal();
        }
        self.tick()
    }

    /// Internal tick without position output (for tick_n).
    fn tick_internal(&mut self) {
        let n = self.nodes.len();
        if n == 0 { return; }

        self.alpha += (0.001 - self.alpha) * self.config.alpha_decay;
        if self.alpha < 1e-6 { return; }

        // Charge
        let charge_nodes: Vec<charge::ChargeNode> = self.nodes.iter().map(|nd| {
            charge::ChargeNode {
                x: nd.x, y: nd.y, z: nd.z,
                charge: if nd.node_type == 0 { self.config.charge_strength } else { self.config.agent_charge_strength },
            }
        }).collect();
        let mut fx = vec![0.0; n];
        let mut fy = vec![0.0; n];
        let mut fz = vec![0.0; n];
        charge::apply_charge(&charge_nodes, self.config.theta, self.alpha, &mut fx, &mut fy, &mut fz);
        for i in 0..n {
            self.nodes[i].vx += fx[i];
            self.nodes[i].vy += fy[i];
            self.nodes[i].vz += fz[i];
        }

        // Links
        {
            let px: Vec<f64> = self.nodes.iter().map(|nd| nd.x).collect();
            let py: Vec<f64> = self.nodes.iter().map(|nd| nd.y).collect();
            let pz: Vec<f64> = self.nodes.iter().map(|nd| nd.z).collect();
            let mut vx: Vec<f64> = self.nodes.iter().map(|nd| nd.vx).collect();
            let mut vy: Vec<f64> = self.nodes.iter().map(|nd| nd.vy).collect();
            let mut vz: Vec<f64> = self.nodes.iter().map(|nd| nd.vz).collect();
            let link_edges: Vec<link::LinkEdge> = self.edges.iter().map(|e| {
                let is_hub_hub = self.nodes[e.source_idx].node_type == 0 && self.nodes[e.target_idx].node_type == 0;
                link::LinkEdge {
                    source: e.source_idx, target: e.target_idx,
                    distance: if is_hub_hub { self.config.link_distance } else { self.config.agent_link_distance },
                    strength: if is_hub_hub { self.config.link_strength } else { self.config.agent_link_strength },
                }
            }).collect();
            link::apply_links(&link_edges, &px, &py, &pz, &mut vx, &mut vy, &mut vz, self.alpha);
            for i in 0..n {
                self.nodes[i].vx = vx[i];
                self.nodes[i].vy = vy[i];
                self.nodes[i].vz = vz[i];
            }
        }

        // Mouse
        if let Some(ref mouse) = self.mouse {
            let r_sq = mouse.radius * mouse.radius;
            for node in &mut self.nodes {
                let dx = node.x - mouse.x;
                let dy = node.y - mouse.y;
                let dz = node.z - mouse.z;
                let dist_sq = dx * dx + dy * dy + dz * dz;
                if dist_sq < r_sq && dist_sq > 1e-6 {
                    let dist = dist_sq.sqrt();
                    let force = mouse.strength * (1.0 - dist / mouse.radius) * self.alpha;
                    let f = force / dist;
                    node.vx += dx * f;
                    node.vy += dy * f;
                    node.vz += dz * f;
                }
            }
        }

        // Velocity decay + position
        let decay = 1.0 - self.config.velocity_decay;
        for node in &mut self.nodes {
            node.vx *= decay; node.vy *= decay; node.vz *= decay;
            node.x += node.vx; node.y += node.vy; node.z += node.vz;
        }

        // Center
        {
            let mut px: Vec<f64> = self.nodes.iter().map(|nd| nd.x).collect();
            let mut py: Vec<f64> = self.nodes.iter().map(|nd| nd.y).collect();
            let mut pz: Vec<f64> = self.nodes.iter().map(|nd| nd.z).collect();
            center::apply_center(&mut px, &mut py, &mut pz, self.config.center_pull);
            for i in 0..n {
                self.nodes[i].x = px[i]; self.nodes[i].y = py[i]; self.nodes[i].z = pz[i];
            }
        }

        // Collision
        {
            let mut px: Vec<f64> = self.nodes.iter().map(|nd| nd.x).collect();
            let mut py: Vec<f64> = self.nodes.iter().map(|nd| nd.y).collect();
            let mut pz: Vec<f64> = self.nodes.iter().map(|nd| nd.z).collect();
            let radii: Vec<f64> = self.nodes.iter().map(|nd| nd.radius).collect();
            collision::apply_collision(&mut px, &mut py, &mut pz, &radii, self.config.collision_radius, self.config.collision_strength);
            for i in 0..n {
                self.nodes[i].x = px[i]; self.nodes[i].y = py[i]; self.nodes[i].z = pz[i];
            }
        }
    }

    /// Get positions as flat array [x0, y0, z0, x1, y1, z1, ...] in insertion order.
    pub fn get_positions(&self) -> Vec<f64> {
        let mut result = Vec::with_capacity(self.insertion_order.len() * 3);
        for id in &self.insertion_order {
            if let Some(&idx) = self.id_to_index.get(id) {
                let n = &self.nodes[idx];
                result.push(n.x);
                result.push(n.y);
                result.push(n.z);
            }
        }
        result
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    pub fn get_node_ids(&self) -> String {
        self.insertion_order.join(",")
    }
}
