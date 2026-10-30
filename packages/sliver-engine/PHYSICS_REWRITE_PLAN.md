# Physics Rewrite Plan

This document is the working plan for the physics-engine rewrite.

## Scope Decisions

- Breaking API changes are allowed.
- Hidden numeric rounding in core math should be removed.
- Runtime collision/solver support will be limited to convex primitives.
- Rectangles will become a special case of convex polygons.
- Concave polygons without holes will be decomposed into multiple convex parts at hitbox-creation time.
- Polygons with holes are out of scope. Game developers should compose those with multiple hitboxes.
- The solver will use a Box2D-style Coulomb friction impulse model, where tangent impulse is clamped relative to the solved normal impulse. This is intentional and does not follow the simplified constant-bound friction model described in section 4.3 of `./Iterative_Dynamics.pdf`.
- Continuous collision detection is out of scope for the first rewrite. High-speed tunneling may still occur in v1.
- The long-term body model should support `bodyType: "static" | "dynamic" | "kinematic"`. If kinematic behavior is not fully implemented in the first runtime milestone, that limitation must be explicit in the docs.
- Kinematic policy target:
  - kinematic bodies have infinite mass/inertia from the solver perspective
  - they are driven by authored velocity or transform
  - they affect dynamic bodies
  - they are not moved by impulses from dynamic bodies
  - kinematic-vs-static and kinematic-vs-kinematic response semantics must be explicit in the implementation milestone where kinematic is introduced
- Initial sleep may be per-body if needed, but the architecture should leave room for island-based sleep later.
- Default material mixing target:
  - friction uses geometric mean
  - restitution uses max
- Physics body transform should become the simulation source of truth. `GameObject` should mirror that transform rather than being the long-term authoritative simulation state.
- Every implementation step must start with tests.

## Execution Rules

For every step below:

1. Write the failing tests first.
2. Implement only enough to make that step green.
3. Refactor while keeping the tests green.
4. Do not start the next step until the current one is stable.

Suggested test layout:

- `tests/physics/math/`
- `tests/physics/geometry/`
- `tests/physics/decomposition/`
- `tests/physics/mass/`
- `tests/physics/contacts/`
- `tests/physics/solver/`
- `tests/physics/integration/`

## Primary References

### Local reference

- `./Iterative_Dynamics.pdf`
  - Constraint model and Jacobians: sections 3.2 to 3.4
  - Friction constraints: section 4.3  
    Note: this paper uses a simplified constant-bound friction model, not the later Box2D-style Coulomb impulse clamp that this rewrite will target.
  - Time stepping / semi-implicit Euler: section 6
  - Projected Gauss-Seidel: section 7.2
  - Contact caching / warm starting: section 8

### External references

- Box2D Simulation documentation  
  https://box2d.org/documentation/md_simulation.html
  - Fixed time step and sub-steps
  - Body types
  - Compound bodies with multiple shapes
  - Density, friction, restitution
  - Sensor shapes
  - Contacts and contact points
  - Collision filtering
  - Sleep and damping

- Erin Catto, Contact Manifolds  
  https://box2d.org/files/ErinCatto_ContactManifolds_GDC2007.pdf
  - SAT with minimum penetration axis
  - Reference/incident face selection
  - Clipping for polygon manifolds
  - Contact IDs and coherence

---

## Step 1: Test Harness And Numeric Assertions

### What should be done

- Add a project test runner using Bun.
- Add helpers for epsilon-based numeric assertions.
- Add fixed-step helpers for deterministic physics stepping.
- Add vector/matrix comparison utilities so tests do not rely on exact float equality.
- Keep this layer small and reusable because every later step depends on it.

### Tests to write first

- A sample unit test that runs under Bun.
- `expectCloseToNumber`
- `expectCloseToVector`
- Fixed-step helper consistency across repeated runs.

### Definition of done

- `bun test` runs reliably.
- Physics tests can assert floats and vectors without brittle exact comparisons.

### Resources

- Box2D Simulation docs: fixed time step and sub-step sections
- `./Iterative_Dynamics.pdf`, section 6 for fixed-step reasoning

---

## Step 2: Numeric Foundation Cleanup

### What should be done

- Remove hidden rounding/snapping behavior from `Vector`.
- Keep vector math pure and deterministic.
- Add any missing operations needed by geometry and solver code:
  - 2D cross helpers
  - perpendicular/tangent helpers
  - safe normalization
  - transform/local-world conversion helpers

This step exists to stop the current physics from “helping itself” by mutating tiny values to zero in the math layer.

### Tests to write first

- Vector addition, subtraction, multiplication, normalization
- Rotation by angle
- Dot and cross products
- Near-zero values remain representable until explicitly clamped by solver logic
- Safe normalization of zero-length vectors

### Definition of done

- Core math is side-effect free except for explicit mutating methods.
- No hidden zeroing occurs in foundational numeric code.

### Resources

- `./Iterative_Dynamics.pdf`, sections 3.1 and 3.2
- Box2D docs: coordinate transformations and vector/body transform sections

---

## Step 3: New Shape Model

### What should be done

- Introduce a unified convex shape model under `src/Physics/` or a similar dedicated module.
- Define:
  - circle shape
  - convex polygon shape
  - rectangle builder as a convex polygon convenience
- Keep shape data in local/body space, not render space.
- Add world-transform helpers so the solver always works from body state plus local shape data.

This step should separate rendering from collision geometry more cleanly than the current hitbox layer.

### Tests to write first

- Circle local-to-world center transform
- Convex polygon local-to-world vertices transform
- Rectangle builder generates expected polygon vertices
- AABB generation for circle and polygon
- Point containment for circle and convex polygon

### Definition of done

- Runtime geometry uses only circle and convex polygon math.
- Rectangles no longer need special collision math outside the convenience constructor.

### Resources

- Box2D docs: shapes, compound bodies, and convex polygon shape sections
- Contact Manifolds PDF: SAT overview and 2D box-box setup

---

## Step 4: Broad Phase Abstraction

### What should be done

- Introduce a dedicated broad-phase layer before narrow phase and solving.
- At minimum, broad phase must own:
  - shape/body proxy AABBs
  - pair generation
  - same-body exclusion
  - candidate overlap production only
- The first implementation may remain naive internally if needed, but it must live behind a dedicated abstraction so it can later become sweep-and-prune or grid-based without changing solver code.
- Filtering may cull candidate pairs before narrow phase.
- Sensor-vs-solid distinction should affect whether solver constraints are created, not whether overlap pairs exist.

Broad phase is a meaningful part of the rewrite, not just plumbing.

### Tests to write first

- Proxy AABBs update deterministically from body transforms
- Same-body shapes are never emitted as candidate pairs
- Non-overlapping proxies are not emitted
- Overlapping proxies are emitted once
- Broad-phase implementation details do not leak into narrow-phase tests

### Definition of done

- Narrow phase and solver consume broad-phase candidate pairs through a dedicated API.
- Broad phase does not absorb gameplay policy beyond geometric candidate generation and same-body exclusion.

### Resources

- Box2D docs: shapes, broad overlap queries, and contact generation flow

---

## Step 5: Mass, Centroid, And Inertia

### What should be done

- Compute mass properties from shapes instead of bounding boxes.
- Implement:
  - circle area, centroid, inertia
  - convex polygon area, centroid, inertia
  - compound-body centroid
  - compound-body inertia using the parallel-axis theorem
- Distinguish static bodies from dynamic bodies cleanly.
- Make body mass properties derived from attached shapes unless explicitly overridden later.

This step replaces the current rough AABB-based inertia approximation.

### Tests to write first

- Circle mass properties
- Rectangle-as-polygon mass properties
- Triangle / arbitrary convex polygon centroid
- Compound body centroid from multiple convex parts
- Compound body inertia changes correctly when shapes are offset from the center of mass
- Static bodies produce zero inverse mass and zero inverse inertia

### Definition of done

- Body mass and inertia come from actual geometry.
- Multiple hitboxes on one body contribute correctly to center of mass and inertia.

### Resources

- Box2D docs: density and “body mass from shapes”
- `./Iterative_Dynamics.pdf`, section 5 for mass/inertia use in the equations of motion

---

## Step 6: Polygon Validation And Concave Decomposition

### What should be done

- Add polygon validation for authoring-time polygon input.
- Support simple polygons without holes.
- Normalize winding.
- Accept and normalize repeated first/last vertex conventions.
- Reject invalid input:
  - self-intersections
  - duplicate consecutive vertices
  - collinear degeneracy that collapses area
  - nearly-collinear edges under the chosen epsilon when they collapse usable area
  - very small-area triangles produced during triangulation
- If the polygon is convex, keep one convex shape.
- If it is concave:
  - triangulate it
  - greedily merge adjacent triangles while the merged polygon remains convex
- Emit a list of convex polygon parts to be attached to the same body.
- Define a practical maximum vertex count per convex part if needed for stability and implementation simplicity.

This keeps the runtime solver convex-only while still giving developers concave hitboxes as an authoring feature.

### Tests to write first

- Convex polygon passes validation unchanged
- Concave polygon is decomposed into valid convex parts
- Self-intersecting polygon is rejected
- Degenerate polygon is rejected
- Orientation normalization preserves shape geometry
- Greedy merge reduces triangle count when legal

### Definition of done

- Any valid simple polygon without holes can become one or more convex parts.
- Invalid polygons fail clearly and deterministically.
- Acceptance rules are explicit enough that decomposition tests are not ambiguous.

### Resources

- Contact Manifolds PDF: convex SAT assumptions and manifold quality discussion
- Box2D docs: convex polygon limitation and compound-body model
- `./Iterative_Dynamics.pdf`: supports the choice of pairwise convex constraints

---

## Step 7: Physics Body Model Independent Of GameObject

### What should be done

- Define a physics body model independent of `GameObject`.
- Body state should include:
  - `position`
  - `angle`
  - `linearVelocity`
  - `angularVelocity`
  - `force`
  - `torque`
  - `mass`, `invMass`
  - `inertia`, `invInertia`
  - `linearDamping`
  - `angularDamping`
  - `staticFriction`, `dynamicFriction`
  - `restitution`
  - `bodyType`
  - sleep state
- Define collision filtering data at either body or shape level:
  - category
  - mask

For v1, keep filtering simple and explicit:

- category/mask filtering is supported
- no group override in v1 unless it is fully specified and tested later

This step should avoid `GameObject` concerns so solver and body semantics stay clean.

### Tests to write first

- Body type semantics for static vs dynamic
- Kinematic type is either supported or explicitly rejected according to the current milestone
- Filtering fields default correctly
- Damping fields default correctly
- Static bodies produce zero inverse mass and zero inverse inertia

### Definition of done

- The physics body model exists independently from engine object lifecycle code.
- Static/dynamic/kinematic policy and collision-filter policy are explicit.
- Material mixing defaults are explicit and testable.

### Resources

- Box2D docs: body types, filtering, damping, sleep

---

## Step 8: Integration With GameObject And Semi-Implicit Euler

### What should be done

- Attach the physics body model to `GameObject`.
- Replace scattered physics state with the new body state.
- Make the physics body transform authoritative for simulation.
- Define how authored transform writes synchronize:
  - gameplay should not mutate simulation transform through stale legacy fields
  - direct authored transform changes must use explicit sync methods
  - such sync operations must wake the physics body when appropriate
- Integrate with semi-implicit Euler.
- Keep rendering decoupled from physics state.

### Tests to write first

- Force updates linear velocity
- Torque updates angular velocity
- Gravity is applied only to dynamic bodies
- Static bodies do not move
- Kinematic behavior is covered according to the chosen v1 policy
- Damping affects linear and angular velocity predictably
- Semi-implicit Euler updates velocity before position
- Sensors do not alter body integration

### Definition of done

- Physics stepping uses explicit body state.
- `GameObject` no longer depends on ad-hoc `speed` plus `rotation` plus `phisics` coupling.
- Transform ownership is explicit and does not depend on ambiguous dual state.

### Resources

- `./Iterative_Dynamics.pdf`, section 6 for semi-implicit Euler
- Box2D docs: body types, gravity, damping, awake/sleep behavior

---

## Step 9: Narrow Phase Contact Generation

### What should be done

- Build narrow-phase contact generation for:
  - circle-circle
  - circle-convex polygon
  - convex polygon-convex polygon
- Return contact manifolds, not single contact points.
- Each manifold should contain:
  - body/shape pair
  - collision normal
  - penetration depth
  - 1 or more contact points
  - contact IDs required for persistence and warm starting later
- For polygon-polygon, use SAT plus reference/incident face clipping.
- Expected v1 manifold point counts:
  - circle-circle: 1 point
  - circle-polygon: generally 1 point
  - polygon-polygon: 1 or 2 points

This is the first step where stacked contacts can become solver-friendly.

### Tests to write first

- Non-overlap cases for every pair type
- Basic overlap cases for every pair type
- Normal direction is stable and points consistently
- Penetration depth is within epsilon
- Polygon-polygon face contact yields 1 or 2 contact points as expected
- Contact IDs remain stable for the same touching configuration

### Definition of done

- The engine can produce stable manifolds for all supported solid shape pairs.
- Contact IDs are part of manifold generation by design, not an optional future add-on.

### Resources

- Contact Manifolds PDF: SAT, reference/incident faces, clipping, contact IDs
- Box2D docs: contact points for convex shapes

---

## Step 10: Contact Constraints And Normal Solver

### What should be done

- Convert manifolds into contact constraints.
- Implement the normal impulse solver first.
- Use sequential impulses / Projected Gauss-Seidel.
- Solve on temporary body velocities, not by translating bodies apart inside the collision loop.
- Use conservative position stabilization via velocity bias:
  - penetration slop
  - Baumgarte factor
  - explicit fixed iteration count for tests
- State explicitly whether v1 uses only velocity-bias stabilization and does not yet use split impulse / NGS variants.
- Write the final body state once per tick after solving.

This is the point where the old inline per-hitbox resolution path should start disappearing.

### Tests to write first

- Dynamic body landing on static floor without sinking
- Two dynamic bodies colliding head-on
- Static-vs-dynamic contact does not move the static body
- Box stack remains stable across many steps
- Body state is written once after solving, not repeatedly per hitbox pair

### Definition of done

- Basic resting contacts are stable without `translate()` hacks.
- Stacks no longer jitter from per-contact immediate rewrites.
- Stabilization parameters are explicit and test-controlled, not hidden heuristics.

### Resources

- `./Iterative_Dynamics.pdf`, section 7.2 on Projected Gauss-Seidel
- `./Iterative_Dynamics.pdf`, section 6 on time stepping
- Box2D docs: contacts and low-velocity inelastic handling

---

## Step 11: Friction And Restitution

### What should be done

- Add friction constraints after the normal solver is stable.
- Support separate static and dynamic friction on the engine side.
- Add restitution handling with a low-speed threshold to avoid micro-bounce jitter.
- Define mixing rules for friction and restitution.
- Use a Box2D-style tangent impulse clamp relative to the solved normal impulse, not the constant contact-mass friction bound from section 4.3 of `./Iterative_Dynamics.pdf`.
- Default mixing policy for v1:
  - friction = geometric mean
  - restitution = max

The exact mixing can be engine-defined, but it should be explicit and consistent.

### Tests to write first

- Bouncy collision with high restitution
- Near-resting collision does not micro-bounce forever
- High friction body settles on a slope
- Low friction body slides on a slope
- Friction impulse is limited relative to normal impulse

### Definition of done

- Sliding, sticking, and bouncing are stable and predictable.
- No hardcoded velocity snaps are needed to fake resting behavior.

### Resources

- `./Iterative_Dynamics.pdf`, section 4.3 on friction constraints
- Box2D docs: friction, restitution, and restitution threshold sections

---

## Step 12: Warm Starting, Contact Persistence, And Sleep

### What should be done

- Cache contact impulses between ticks.
- Match new contacts to old contacts using contact IDs.
- Warm start the solver with cached impulses.
- Add sleep rules for bodies or islands that remain below linear and angular thresholds long enough.
- Wake sleeping bodies when they receive impulses, forces, or new collisions.
- If island-based sleep is deferred in v1, wake propagation across touching/contact-linked bodies is still required.

The first implementation may use per-body sleep if needed. If island-based sleep is deferred, that should be explicit.

This step is what should replace the current post-collision snap/sleep heuristics.

### Tests to write first

- Warm-started resting stack converges faster than cold-started stack
- Contact cache survives small motion between frames
- Sleeping stack remains still over many steps
- Sleeping body wakes on impact
- Sleep does not occur while a body is still meaningfully moving

### Definition of done

- Resting piles become quiet because of solver coherence and sleep logic, not because of rotation snapping or velocity zeroing hacks.

### Resources

- `./Iterative_Dynamics.pdf`, section 8 on contact caching
- Contact Manifolds PDF: contact IDs and coherence
- Box2D docs: sleep behavior and body wake/sleep controls

---

## Step 13: Sensors, Filtering, And Gameplay Hooks

### What should be done

- Preserve the gameplay-facing collision hooks while changing the runtime.
- Keep:
  - `beforeColision`
  - `onColision`
- Ensure non-solid hitboxes behave as sensors:
  - overlap events still happen
  - no physical contact constraints are created
- Ensure shapes on the same body never collide with each other.
- Make collision eligibility explicit through the chosen filtering model.

### Tests to write first

- Sensor overlaps trigger callbacks but do not change velocities
- Solid shapes trigger callbacks and physical response
- `beforeColision` can suppress handling
- Compound shapes on one body do not self-collide
- Multiple hitboxes on one object still generate one coherent body response
- Filtering rules include/exclude collisions predictably

### Definition of done

- Gameplay code keeps its collision hooks.
- Solid-vs-sensor behavior is explicit and correct.
- Filtering behavior is explicit rather than hidden behind ad-hoc gameplay exceptions.

### Resources

- Box2D docs: sensor flag, compound bodies, collision filtering
- Existing Sliver physics docs for intended gameplay semantics:
  - `website/docs/concepts/physics.mdx`

---

## Step 14: Scene Integration

### What should be done

- Replace the old `Scene.handleColisions()` pipeline with a single physics-world step.
- Stop resolving collisions inline while iterating hitboxes.
- Move broad phase, narrow phase, solver, and state writeback into a single physics entrypoint.
- Keep scene code focused on orchestration, not on impulse math.

### Tests to write first

- Scene tick advances body integration and collision handling deterministically
- Compound objects collide as one body with multiple shapes
- Scene gravity still behaves correctly with the new body state
- Existing event flow survives scene integration

### Definition of done

- `Scene` no longer contains solver heuristics or inline positional correction logic.

### Resources

- `./Iterative_Dynamics.pdf`, sections 6 to 8
- Box2D docs: world stepping and body event flow

---

## Step 15: Debug Stress Scene

### What should be done

- Build a dedicated debug scene specifically for regression and visual inspection.
- Include:
  - many dynamic objects
  - compound bodies with multiple convex parts
  - circles, rectangles, convex polygons
  - concave authoring examples that decompose into convex parts
  - tall stacks
  - mixed friction materials
  - mixed restitution materials
  - slope tests
  - sensor-only zones
- Make the scene easy to reproduce and deterministic.

### Tests to write first

- Fixed-step regression scenarios that mirror the debug scene layout
- Long-run stack stability scenario
- Concave decomposition scenario that verifies the expected number of convex parts and stable resting behavior
- Mass-ratio scenarios that document expected stability envelopes instead of pretending extreme ratios are free

### Definition of done

- The debug scene is a visual regression tool, not the only verification method.
- Automated tests cover the same classes of problems that the debug scene exposes.

### Resources

- `./Iterative_Dynamics.pdf`, section 9.1 on box stacking as a validation target
- `./Iterative_Dynamics.pdf`, section 1 discussion of mass-ratio limitations
- Box2D docs: recommended fixed time step and sub-steps

---

## Step 16: Documentation And Migration Pass

### What should be done

- Update public docs after the runtime is stable.
- Replace references to the old physics model.
- Document:
  - the new body state API
  - convex polygon hitboxes
  - concave polygon decomposition rules
  - sensors vs solids
  - collision filtering policy
  - supported body types
  - damping
  - any changed friction/restitution behavior
  - no CCD / tunneling caveat in v1
- Update examples and debug-game usage.
- Explicitly document likely breaking surfaces:
  - `GameObject.speed`
  - `rotation` / `angularVelocity`
  - `phisics` descriptor
  - hitbox constructors / shape ownership
  - `Scene.getGravity()` semantics
  - whether any compatibility wrappers still exist

### Tests to write first

- Type-level or smoke tests for the new public API where practical
- Example-level smoke tests if test harness supports them

### Definition of done

- The code, docs, and examples describe the same engine behavior.

### Resources

- Box2D docs for terminology alignment
- `./Iterative_Dynamics.pdf` for solver terminology
- `website/docs/concepts/physics.mdx`

---

## Suggested Initial Order Of Work

If work needs to be batched into milestones, use this order:

1. Steps 1 to 3
2. Steps 4 to 5
3. Steps 7 to 10
4. Steps 11 to 12
5. Step 6
6. Steps 13 to 15
7. Step 16

## Non-Goals For The First Rewrite

- Polygon holes
- Concave runtime collision algorithms
- Continuous collision detection
- Time of impact / speculative contacts
- Joints
- Soft bodies
- Optimal minimum-piece convex decomposition

## Determinism Requirements For Solver Tests

Solver and integration tests should explicitly fix:

- iteration count
- bias coefficient
- penetration slop
- warm-start scaling
- time step

This prevents ambiguous failures where the solver changed because configuration drifted rather than because the implementation regressed.
