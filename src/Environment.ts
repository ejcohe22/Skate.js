import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { Skatepark } from "./Skatepark";

export class Environment {
  public groundColliders: Set<number> = new Set();
  public skatepark: Skatepark;

  constructor(
    public scene: THREE.Scene,
    private world: RAPIER.World,
    private length: number,
    private width: number
  ) {
    // set up ground
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(length, width), new THREE.MeshStandardMaterial({ color: 0x808080 }));
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    const grid = new THREE.GridHelper(length, (length / 5), 0xccff00, 0xff00ff);
    scene.add(grid);

    // meshes + keep track of colliders
    const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const groundCollider = world.createCollider(RAPIER.ColliderDesc.cuboid((length / 2), 0.1, (width / 2)), groundBody);
    this.groundColliders.add(groundCollider.handle);

    // set up skatepark
    this.skatepark = new Skatepark(scene, world);
    for (const piece of this.skatepark.builder.pieces) {
      if (piece.colliders) {
        for (const collider of piece.colliders) {
          // optional: only add fixed colliders
          if (collider.parent()?.isFixed()) {
            this.groundColliders.add(collider.handle);
          }
        }
      }
    }
  }

  setupDefaultLighting() {
    const sun = new THREE.DirectionalLight(0xffaacc, 1.0);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x77b5ff, 0x444444, 0.6);
    this.scene.add(hemi);

    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(amb);
  }

  setSkyColor(hex: number | string) {
    this.scene.background = new THREE.Color(hex as any);
  }
}