import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export type PieceTag = "park" | "environment" | "prop";

export interface ISceneObject {
  id: string;
  mesh: THREE.Object3D;
  tag?: PieceTag;
  /** optional reference to the created physics collider for debug / removal */
  collider?: RAPIER.Collider;
  /** optional rigid body created for the object */
  body?: RAPIER.RigidBody;
  /** optional update each frame */
  update?(dt: number): void;
}

export interface ISnapPoint {
  position: THREE.Vector3;      // local-space position
  rotation?: THREE.Quaternion;  // optional local rotation (default = identity)
}

export interface IParkPiece {
    id: string;
    mesh: THREE.Object3D;
    size?: THREE.Vector3;
    snapPoints?: ISnapPoint[];
    tag: PieceTag;
    colliders?: RAPIER.Collider[];
    body?: any;      // optional physics body
    snapTo?(worldPos: THREE.Vector3, worldQuat?: THREE.Quaternion): void;
  }

export interface DebugOptions {
  showColliders?: boolean;
  logColliders?: boolean;
}