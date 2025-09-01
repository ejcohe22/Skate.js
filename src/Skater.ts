import * as THREE from "three";
import { KeyboardController } from "./lib/Controls/KeyboardController";
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

  private jumpCharge = 0; // seconds or arbitrary units
  private maxJumpCharge = 1.5; // max charge

  groundContacts = 0; // number of current contacts with ground
  isGrounded = false;

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
    // Keep originals
    //const originalApplyImpulse = this.body.applyImpulse.bind(this.body);

    // Wrap applyImpulse
    //this.body.applyImpulse = (impulse: RAPIER.Vector, wakeUp: boolean) => {
    //  console.log("Impulse applied to skater:", impulse);
    //  return originalApplyImpulse(impulse, wakeUp);
    //};

    const collider = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.25)
      .setTranslation(0, 1, 0)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
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
      input.multiplyScalar(moveSpeed);
    } else {
      // natural friction
      input.set(0, 0, 0);
    }

    const vel = this.body.linvel();
    const velDiff = new RAPIER.Vector3(
      input.x - vel.x,
      0, // preserve Y for jumps
      input.z - vel.z,
    );

    const mass = this.body.mass();
    const impulse = new RAPIER.Vector3(velDiff.x * mass, velDiff.y * mass, velDiff.z * mass);
    this.body.applyImpulse(impulse, true);

    // --- Jump / charge logic ---
    if (this.isGrounded) {
      if (this.controller.push) {
        // charge jump
        this.jumpCharge += delta*10;
        if (this.jumpCharge > this.maxJumpCharge) this.jumpCharge = this.maxJumpCharge;
        // TODO: show visual indicator for jumpCharge
      } else if (this.jumpCharge > 0) {
        // release jump
        const impulse = new RAPIER.Vector3(0, this.jumpCharge * 10, 0);

        // Apply impulse at the rigid body’s center of mass
        this.body.applyImpulse(impulse, true);
        this.jumpCharge = 0;
      }
    } else {
      this.jumpCharge = 0;
    }

    // Rotation via trick keys
    let yawDelta = 0;
    const turnSpeed = 3;
    if (this.controller.trickLeft) yawDelta = turnSpeed * delta;
    if (this.controller.trickRight) yawDelta = -turnSpeed * delta;
    if (yawDelta !== 0) this.applyYaw(yawDelta);
    this.body.setAngvel(new RAPIER.Vector3(0, 0, 0), true);
  }

  private applyOnBoardMovement(delta: number) {
    if (!this.onBoard) return;
  
    const turnSpeed = 2.0;      // how fast skater can rotate
    const pushImpulse = 5.0;    // base impulse strength
    const maxPushStack = 3;
    const friction = 0.99;      // per-frame velocity damping
  
    // --- Forward push ---
    if (this.controller.pushPressed && this.pushStack < maxPushStack) {
      this.pushStack++;
  
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.getBodyQuaternion());
      const vel = this.body.linvel();
      const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  
      // Scale impulse inversely to speed so high speed doesn't over-accelerate
      const impulseScale = 1 / (1 + speed);
      const impulse = new RAPIER.Vector3(forward.x * pushImpulse * impulseScale, 0, forward.z * pushImpulse * impulseScale);
  
      this.body.applyImpulse(impulse, true);
  
      this.controller.pushPressed = false;
    }
  
    // --- Turning ---
    const turnInput = (this.controller.left ? 1 : 0) - (this.controller.right ? 1 : 0);
    if (turnInput !== 0) {
      const vel = new THREE.Vector3(this.body.linvel().x, 0, this.body.linvel().z);
      const speed = vel.length();

        // Gradually rotate velocity towards facing
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.getBodyQuaternion());
        const newVel = vel.lerp(forward.multiplyScalar(speed), turnSpeed * delta);
        this.body.setLinvel(new RAPIER.Vector3(newVel.x, this.body.linvel().y, newVel.z), true);
    }
  
    // --- Friction / drag ---
    const vel = this.body.linvel();
    const dampened = new RAPIER.Vector3(vel.x * friction, vel.y, vel.z * friction);
    this.body.setLinvel(dampened, true);
  
    // --- Gradually reset push stack ---
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
