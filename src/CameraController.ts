import * as THREE from "three";
import { Skater } from "./Skater";

export class CameraController {
  camera: THREE.PerspectiveCamera;
  target: Skater;
  offset = new THREE.Vector3(0, 3, -5);

  constructor(camera: THREE.PerspectiveCamera, target: Skater) {
    this.camera = camera;
    this.target = target;
  }

  update() {
    const desiredPos = this.target.mesh.position
      .clone()
      .add(this.offset.clone().applyQuaternion(this.target.mesh.quaternion));
    this.camera.position.lerp(desiredPos, 0.1);
    this.camera.lookAt(this.target.mesh.position);
  }
}
