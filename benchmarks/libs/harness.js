/**
 * Shared benchmark harness injected into every test page.
 * Exposes window.__BENCH for the Playwright runner to read.
 *
 * Usage in test pages:
 *   <script src="harness.js"></script>
 *   <script>
 *     BenchHarness.markFirstFrame();          // call once on first render
 *     BenchHarness.markInteractive();         // call when user can interact
 *     BenchHarness.reportPhysicsTick(ms);     // call per simulation tick
 *     BenchHarness.reportRenderFrame(ms);     // call per render frame
 *   </script>
 */
(function () {
  const state = {
    mountTime: performance.now(),
    firstFrameTime: null,
    interactiveTime: null,
    physicsTicks: [],
    renderFrames: [],
    fpsLog: [],
    _frameCount: 0,
    _lastFpsTimestamp: performance.now(),
    _running: true,
  };

  // FPS counter via rAF
  function fpsLoop(now) {
    if (!state._running) return;
    state._frameCount++;
    const elapsed = now - state._lastFpsTimestamp;
    if (elapsed >= 1000) {
      const fps = Math.round((state._frameCount * 1000) / elapsed);
      state.fpsLog.push(fps);
      state._frameCount = 0;
      state._lastFpsTimestamp = now;
    }
    requestAnimationFrame(fpsLoop);
  }
  requestAnimationFrame(fpsLoop);

  window.BenchHarness = {
    markFirstFrame() {
      if (!state.firstFrameTime) {
        state.firstFrameTime = performance.now();
      }
    },
    markInteractive() {
      if (!state.interactiveTime) {
        state.interactiveTime = performance.now();
      }
    },
    reportPhysicsTick(ms) {
      if (state.physicsTicks.length < 600) {
        state.physicsTicks.push(ms);
      }
    },
    reportRenderFrame(ms) {
      if (state.renderFrames.length < 600) {
        state.renderFrames.push(ms);
      }
    },
  };

  // Expose results for Playwright to read
  Object.defineProperty(window, '__BENCH', {
    get() {
      const mem = performance.memory
        ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          }
        : null;
      const fps = state.fpsLog.slice();
      const steadyFps =
        fps.length > 2 ? fps.slice(Math.floor(fps.length * 0.3)) : fps;
      const avgFps =
        steadyFps.length > 0
          ? Math.round(steadyFps.reduce((a, b) => a + b, 0) / steadyFps.length)
          : 0;
      const medianPhysics = median(state.physicsTicks);
      const medianRender = median(state.renderFrames);
      return {
        avgFps,
        fpsLog: fps,
        timeToFirstFrame: state.firstFrameTime
          ? state.firstFrameTime - state.mountTime
          : null,
        startupTime: state.interactiveTime
          ? state.interactiveTime - state.mountTime
          : null,
        physicsTickMs: medianPhysics,
        renderFrameMs: medianRender,
        memory: mem,
      };
    },
  });

  function median(arr) {
    if (arr.length === 0) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
})();
