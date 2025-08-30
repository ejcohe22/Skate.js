import * as THREE from "three";
import { KeyboardController } from "./controls/KeyboardController";
import RAPIER from "@dimforge/rapier3d-compat";

export class Skater {
  mesh: THREE.Object3D;
  controller: KeyboardController;
  body: RAPIER.RigidBody;

  onBoard = false;

  // On-board movement
  velocity = new THREE.Vector3(); // current velocity for smooth glide
  pushStack = 0; // tracks consecutive pushes (max 3)
  maxPushStack = 3;

  constructor(controller: KeyboardController, world: RAPIER.World) {
    this.controller = controller;

    this.mesh = new THREE.Group();

    // Body mesh
    const bodyGeom = new THREE.BoxGeometry(1, 2, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.position.y = 1;
    this.mesh.add(bodyMesh);

    // Nose indicator
    const noseGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.set(0, 1, 0.5);
    this.mesh.add(nose);

    // Physics body
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 1, 0)
      .enabledRotations(false, true, false); // Only Y rotation
    this.body = world.createRigidBody(bodyDesc);

    const collider = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.25).setTranslation(0, 1, 0);
    world.createCollider(collider, this.body);
  }

  update(delta: number) {
    this.handleBoardToggle();
    this.applyOffBoardMovement(delta);
    this.applyOnBoardMovement(delta);
    this.syncMesh();
  }

  private handleBoardToggle() {
    if (this.controller.caveman) {
      this.onBoard = !this.onBoard;
      // Quick deceleration if hopping off board
      if (!this.onBoard) this.velocity.multiplyScalar(0.3);
      this.controller.caveman = false;
      this.pushStack = 0; // reset push stack on toggle
    }
  }

  private applyOffBoardMovement(delta: number) {
    if (this.onBoard) return;

    const moveSpeed = 5;

    // WASD movement relative to facing
    const input = new THREE.Vector3(
      (this.controller.right ? -1 : 0) + (this.controller.left ? 1 : 0),
      0,
      (this.controller.forward ? 1 : 0) + (this.controller.backward ? -1 : 0),
    );

    if (input.lengthSq() > 0) {
      input.normalize().multiplyScalar(moveSpeed);

      // Rotate input to world space
      input.applyQuaternion(this.getBodyQuaternion());

      const impulse = new RAPIER.Vector3(input.x, input.y, input.z);
      this.body.setLinvel(impulse, true); // directly set velocity instead of impulse
    } else {
      // natural friction
      const vel = this.body.linvel();
      this.body.setLinvel(new RAPIER.Vector3(vel.x * 0.9, vel.y, vel.z * 0.9), true);
    }

    // Rotation via trick keys
    let yawDelta = 0;
    const turnSpeed = 1;
    if (this.controller.trickLeft) yawDelta = turnSpeed * delta;
    if (this.controller.trickRight) yawDelta = -turnSpeed * delta;
    if (yawDelta !== 0) this.applyYaw(yawDelta);
  }

  private applyOnBoardMovement(delta: number) {
    if (!this.onBoard) return;

    const turnSpeed = 2.0;
    const pushStrength = 10.5;
    const maxPushStack = 3;
    const groundFriction = 1.0001; // how much speed drops per frame

    // --- Handle forward pushes ---
    if (this.controller.pushPressed && this.pushStack < maxPushStack) {
      this.pushStack++;
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.getBodyQuaternion());
      forward.multiplyScalar(pushStrength);
      
      // Add to current velocity rather than replace
      const vel = this.body.linvel();
      const newVel = new RAPIER.Vector3(
        vel.x + forward.x,
        vel.y,
        vel.z + forward.z
      );
      this.body.setLinvel(newVel, true);

      this.controller.pushPressed = false;
    }

    // --- Turning that bends velocity ---
    const turnInput = (this.controller.left ? 1 : 0) - (this.controller.right ? 1 : 0);
    if (turnInput !== 0) {
      let vel = this.body.linvel();
      let speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

      // Turn angle scales with speed
      const angle = turnInput * turnSpeed * delta * (1 + 1 / (speed + 0.1));
      this.applyYaw(angle);

      vel = this.body.linvel();
      speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.getBodyQuaternion());
      const newVel = new RAPIER.Vector3(forward.x * speed, vel.y, forward.z * speed);
    
      // Set new linear velocity
      this.body.setLinvel(newVel, true);
    }

    // --- Friction (applie:wqs only when grounded) ---
    const vel = this.body.linvel();
    const newVel = new RAPIER.Vector3(vel.x / groundFriction, vel.y, vel.z / groundFriction);
    this.body.setLinvel(newVel, true);

    // --- Reset push stack gradually (so repeated taps matter) ---
    this.pushStack -= delta;
    if (this.pushStack < 0) this.pushStack = 0;
  }

  private syncMesh() {
    const pos = this.body.translation();
    const rot = this.body.rotation();
    this.mesh.position.set(pos.x, pos.y, pos.z);
    this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
  }

  private applyYaw(delta: number) {
    const rot = this.body.rotation();
    const quat = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");
    euler.y += delta;
    quat.setFromEuler(euler);
    this.body.setRotation(new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w), true);
  }

  private getBodyQuaternion(): THREE.Quaternion {
    const rot = this.body.rotation();
    return new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
  }
}
