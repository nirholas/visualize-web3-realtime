// ============================================================================
// swarming-physics — WASM Force Simulation Engine
//
// Barnes-Hut O(n log n) force simulation compiled to WebAssembly.
// Drop-in replacement for d3-force-3d with 3-5x performance improvement.
// ============================================================================

mod forces;
mod simulation;
mod spatial;

use simulation::SimulationInner;
use wasm_bindgen::prelude::*;

/// Configuration for the force simulation, passed from JavaScript.
#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimConfig {
    #[serde(default = "default_charge_strength")]
    pub charge_strength: f64,
    #[serde(default = "default_agent_charge_strength")]
    pub agent_charge_strength: f64,
    #[serde(default = "default_link_distance")]
    pub link_distance: f64,
    #[serde(default = "default_agent_link_distance")]
    pub agent_link_distance: f64,
    #[serde(default = "default_link_strength")]
    pub link_strength: f64,
    #[serde(default = "default_agent_link_strength")]
    pub agent_link_strength: f64,
    #[serde(default = "default_center_pull")]
    pub center_pull: f64,
    #[serde(default = "default_collision_radius")]
    pub collision_radius: f64,
    #[serde(default = "default_collision_strength")]
    pub collision_strength: f64,
    #[serde(default = "default_alpha_decay")]
    pub alpha_decay: f64,
    #[serde(default = "default_velocity_decay")]
    pub velocity_decay: f64,
    #[serde(default = "default_theta")]
    pub theta: f64,
}

fn default_charge_strength() -> f64 { -200.0 }
fn default_agent_charge_strength() -> f64 { -8.0 }
fn default_link_distance() -> f64 { 25.0 }
fn default_agent_link_distance() -> f64 { 5.0 }
fn default_link_strength() -> f64 { 0.1 }
fn default_agent_link_strength() -> f64 { 0.3 }
fn default_center_pull() -> f64 { 0.03 }
fn default_collision_radius() -> f64 { 0.3 }
fn default_collision_strength() -> f64 { 0.7 }
fn default_alpha_decay() -> f64 { 0.01 }
fn default_velocity_decay() -> f64 { 0.4 }
fn default_theta() -> f64 { 0.9 }

impl Default for SimConfig {
    fn default() -> Self {
        SimConfig {
            charge_strength: default_charge_strength(),
            agent_charge_strength: default_agent_charge_strength(),
            link_distance: default_link_distance(),
            agent_link_distance: default_agent_link_distance(),
            link_strength: default_link_strength(),
            agent_link_strength: default_agent_link_strength(),
            center_pull: default_center_pull(),
            collision_radius: default_collision_radius(),
            collision_strength: default_collision_strength(),
            alpha_decay: default_alpha_decay(),
            velocity_decay: default_velocity_decay(),
            theta: default_theta(),
        }
    }
}

/// WASM-exported force simulation.
#[wasm_bindgen]
pub struct Simulation {
    inner: SimulationInner,
}

#[wasm_bindgen]
impl Simulation {
    /// Create a new simulation with optional config (passed as JS object).
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<Simulation, JsError> {
        let cfg: SimConfig = if config.is_undefined() || config.is_null() {
            SimConfig::default()
        } else {
            serde_wasm_bindgen::from_value(config)
                .map_err(|e| JsError::new(&format!("Invalid config: {e}")))?
        };
        Ok(Simulation {
            inner: SimulationInner::new(cfg),
        })
    }

    /// Add a node. `node_type`: 0 = hub, 1 = agent.
    /// `radius` is the node's collision radius.
    pub fn add_node(
        &mut self,
        id: &str,
        x: f64,
        y: f64,
        z: f64,
        node_type: u8,
        radius: f64,
    ) {
        self.inner.add_node(id, x, y, z, node_type, radius);
    }

    /// Add an edge between two node IDs.
    pub fn add_edge(&mut self, source: &str, target: &str) {
        self.inner.add_edge(source, target);
    }

    /// Remove a node and all its edges.
    pub fn remove_node(&mut self, id: &str) {
        self.inner.remove_node(id);
    }

    /// Remove an edge between two nodes.
    pub fn remove_edge(&mut self, source: &str, target: &str) {
        self.inner.remove_edge(source, target);
    }

    /// Clear all nodes and edges.
    pub fn clear(&mut self) {
        self.inner.clear();
    }

    /// Advance the simulation by one tick.
    /// Returns a flat Float64Array: [x0, y0, z0, x1, y1, z1, ...] in node insertion order.
    pub fn tick(&mut self) -> Vec<f64> {
        self.inner.tick()
    }

    /// Advance the simulation by `n` ticks without returning intermediate positions.
    /// Returns final positions as flat Float64Array.
    pub fn tick_n(&mut self, n: u32) -> Vec<f64> {
        self.inner.tick_n(n)
    }

    /// Get current positions without ticking.
    pub fn get_positions(&self) -> Vec<f64> {
        self.inner.get_positions()
    }

    /// Get the number of nodes.
    pub fn node_count(&self) -> usize {
        self.inner.node_count()
    }

    /// Get the number of edges.
    pub fn edge_count(&self) -> usize {
        self.inner.edge_count()
    }

    /// Set the simulation alpha (energy level).
    pub fn set_alpha(&mut self, alpha: f64) {
        self.inner.alpha = alpha;
    }

    /// Get the current alpha.
    pub fn get_alpha(&self) -> f64 {
        self.inner.alpha
    }

    /// Set charge (repulsion) strength for hub nodes.
    pub fn set_charge(&mut self, strength: f64) {
        self.inner.config.charge_strength = strength;
    }

    /// Set charge strength for agent nodes.
    pub fn set_agent_charge(&mut self, strength: f64) {
        self.inner.config.agent_charge_strength = strength;
    }

    /// Set link distance for hub-hub edges.
    pub fn set_link_distance(&mut self, distance: f64) {
        self.inner.config.link_distance = distance;
    }

    /// Set link distance for agent-hub edges.
    pub fn set_agent_link_distance(&mut self, distance: f64) {
        self.inner.config.agent_link_distance = distance;
    }

    /// Set center pull strength.
    pub fn set_center_pull(&mut self, pull: f64) {
        self.inner.config.center_pull = pull;
    }

    /// Set collision radius padding.
    pub fn set_collision_radius(&mut self, radius: f64) {
        self.inner.config.collision_radius = radius;
    }

    /// Set Barnes-Hut theta parameter (higher = faster but less accurate).
    pub fn set_theta(&mut self, theta: f64) {
        self.inner.config.theta = theta;
    }

    /// Set a mouse repulsion force at the given world position.
    /// Set strength to 0 to disable.
    pub fn set_mouse_repulsion(&mut self, x: f64, y: f64, z: f64, strength: f64, radius: f64) {
        self.inner.set_mouse_repulsion(x, y, z, strength, radius);
    }

    /// Get node IDs in insertion order (returns comma-separated string).
    pub fn get_node_ids(&self) -> String {
        self.inner.get_node_ids()
    }
}
