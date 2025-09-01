import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { IParkPiece, DebugOptions } from "./Types";
import { ColliderFactory } from "./ColliderFactory";

/**
 * ParkBuilder composes pieces and maintains a registry.
 * It supports:
 *  - declarative addPiece(config)
 *  - snapTo(targetPiece, snapIndex)
 *  - removing pieces (teardown)
 */
export class ParkBuilder {
  pieces: IParkPiece[] = [];
  private colliderFactory: ColliderFactory;

  constructor(private scene: THREE.Scene, private world: RAPIER.World, debug: DebugOptions = {}) {
    this.colliderFactory = new ColliderFactory(world, debug);
  }

  addPiece(piece: IParkPiece, colliderType: "auto" | "box" | "convex" | "trimesh" = "auto", isStatic = true) {
    this.scene.add(piece.mesh);

    if (!piece.size) {
      const box = new THREE.Box3().setFromObject(piece.mesh);
      piece.size = box.getSize(new THREE.Vector3());
    }

    const results = this.colliderFactory.createForObject(piece.mesh, {
      type: colliderType,
      isStatic,
    });

    piece.colliders = results.map(r => r.collider);
    // If it’s a single mesh, you can store its body
    piece.body = results.length === 1 ? results[0]!.body : undefined;
  
    this.pieces.push(piece);
    return piece;
  }

  snapPieceTo(piece: IParkPiece, target: IParkPiece, targetSnapIndex = 0, mySnapIndex = 0) {
    if (!target.snapPoints || !piece.snapPoints) return;
  
    const targetSnap = target.snapPoints[targetSnapIndex]!;
    const mySnap = piece.snapPoints[mySnapIndex]!;
  
    // target snap in world space
    const targetWorldPos = targetSnap.position.clone().applyMatrix4(target.mesh.matrixWorld);
    const targetWorldQuat = target.mesh.getWorldQuaternion(new THREE.Quaternion());
    if (targetSnap.rotation) targetWorldQuat.multiply(targetSnap.rotation);
  
    // my snap in world space
    const myWorldPos = mySnap.position.clone().applyMatrix4(piece.mesh.matrixWorld);
    const myWorldQuat = piece.mesh.getWorldQuaternion(new THREE.Quaternion());
    if (mySnap.rotation) myWorldQuat.multiply(mySnap.rotation);
  
    // rotation needed to align my snap
    const deltaQuat = targetWorldQuat.clone().multiply(myWorldQuat.clone().invert());
  
    // translation to align my snap
    const deltaPos = targetWorldPos.clone().sub(myWorldPos);
  
    // Apply translation & rotation to mesh first
    piece.mesh.position.add(deltaPos);
    piece.mesh.quaternion.premultiply(deltaQuat);
  
    // Apply same transform to all physics bodies (colliders may belong to same body)
    if (piece.colliders) {
      const bodies = new Set<RAPIER.RigidBody>();
      piece.colliders.forEach(c => bodies.add(c.parent()!));
      bodies.forEach(body => {
        const p = piece.mesh.getWorldPosition(new THREE.Vector3());
        const q = piece.mesh.getWorldQuaternion(new THREE.Quaternion());
        body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
        body.setRotation(new RAPIER.Quaternion(q.x, q.y, q.z, q.w), true);
      });
    } else if (piece.body) {
      const p = piece.mesh.getWorldPosition(new THREE.Vector3());
      const q = piece.mesh.getWorldQuaternion(new THREE.Quaternion());
      piece.body.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
      piece.body.setRotation(new RAPIER.Quaternion(q.x, q.y, q.z, q.w), true);
    }
  }
  

  removePiece(piece: IParkPiece) {
    // remove physics
    if (piece.colliders) {
      piece.colliders.forEach((col) => this.world.removeCollider(col, true));
    }
    if (piece.body) this.world.removeRigidBody(piece.body);
    // remove visuals
    this.scene.remove(piece.mesh);
    this.pieces = this.pieces.filter(p => p !== piece);
  }

  /** Move a piece (single mesh or group) by a delta vector */
  translatePiece(piece: IParkPiece, delta: THREE.Vector3) {
    // Move the visual mesh
    piece.mesh.position.add(delta);

    // Move all physics bodies
    piece.colliders?.forEach((collider) => {
      const body = collider.parent()!;
      const t = body.translation();
      body.setTranslation(
        { x: t.x + delta.x, y: t.y + delta.y, z: t.z + delta.z },
        true
      );
    });
  }

  /** Rotate a piece (around its origin) by a quaternion */
  rotatePiece(piece: IParkPiece, quat: THREE.Quaternion) {
    // Rotate the visual mesh
    piece.mesh.quaternion.premultiply(quat);

    // Rotate all physics bodies around the piece origin
    const origin = piece.mesh.getWorldPosition(new THREE.Vector3());

    piece.colliders?.forEach((collider) => {
      const body = collider.parent()!;
      const pos = body.translation();

      // Translate to origin, rotate, translate back
      const relative = new THREE.Vector3(pos.x, pos.y, pos.z).sub(origin);
      relative.applyQuaternion(quat);
      const newPos = origin.clone().add(relative);

      body.setTranslation({ x: newPos.x, y: newPos.y, z: newPos.z }, true);

      // Rotate body
      const bodyQuat = body.rotation();
      const rot = new RAPIER.Quaternion(
        quat.x * bodyQuat.x,
        quat.y * bodyQuat.y,
        quat.z * bodyQuat.z,
        quat.w * bodyQuat.w
      );
      
      body.setRotation(rot, true);
    });
  }

  showSnapPoints(piece: IParkPiece) {
    if (!piece.snapPoints || piece.snapPoints.length === 0) return;
  
    piece.snapPoints.forEach((sp, i) => {
      const markerGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
      const marker = new THREE.Mesh(markerGeo, markerMat);
  
      // snapPoint position is in local space, convert to world space
      const worldPos = sp.position.clone().applyMatrix4(piece.mesh.matrixWorld);
      marker.position.copy(worldPos);
  
      // optional: label with index
      const sprite = this.makeTextSprite(`${i}`);
      sprite.position.copy(worldPos.clone().add(new THREE.Vector3(0, 0.1, 0)));
      piece.mesh.parent?.add(sprite);
  
      // add marker to scene (or parent so it moves with piece)
      piece.mesh.parent?.add(marker);
    });
  }

  private makeTextSprite(message: string) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    context.font = "90px Arial";
    context.fillStyle = "white";
    context.fillText(message, 0, 24);
  
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    return new THREE.Sprite(spriteMaterial);
  }
}