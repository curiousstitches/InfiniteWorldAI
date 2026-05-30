# Animation Clips (GLB)

Drop converted Ready Player Me animation GLBs here. Filenames must match CLIP_MANIFEST
in client/src/engine/visual/animController.js:

idle.glb talk.glb walk.glb turn.glb sit.glb stand.glb nod.glb shake_head.glb
wave.glb lean_in.glb step_back.glb look_around.glb gesture_hands.glb point.glb
shrug.glb laugh.glb tilt_head.glb

## How to produce them (one-time, on a computer with Node)
1. Clone the RPM animation library:  github.com/readyplayerme/animation-library
2. Clone the converter:              github.com/crazyramirez/FBX2GLB-Batch-Convert-Optimizer
3. Run the converter on the masculine/feminine FBX clips → GLB
4. Rename outputs to the filenames above, copy them here, commit, push.

Until clips are present, the app auto-falls back to procedural head/torso motion —
the companion still turns, nods, and emotes; it just won't do full-body mocap yet.
