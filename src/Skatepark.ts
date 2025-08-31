import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { PhysicsUtils } from "./lib/PhysicsUtils";

export class Skatepark {
  public object3D: THREE.Object3D | null = null;
  public groundColliders: Set<number> = new Set();

  constructor(
    private world: RAPIER.World,
    private scene: THREE.Scene,
    // vite serves any thing in "public" as root directory :)
    private assetPath: string = "/Skate.js/assets/meshes/",
  ) {
    this.world = world;
    this.scene = scene;
    this.assetPath = assetPath;
  }

  /**
   * Load the skatepark model and hook up colliders
   */
  async load(): Promise<void> {
    const loader = new GLTFLoader();
    const gltf = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load(
        `${this.assetPath}Skatepark.glb`,
        (g: {
          scene:
            | THREE.Group<THREE.Object3DEventMap>
            | PromiseLike<THREE.Group<THREE.Object3DEventMap>>;
        }) => resolve(g.scene),
        undefined,
        reject,
      );
    });

    this.object3D = gltf;

    // Position / scale adjustments
    this.object3D.scale.set(5, 5, 5); // adjust if needed
    this.object3D.position.set(0, -20, 0);
    //this.object3D.rotation.x = -Math.PI / 2;
    this.object3D.updateMatrixWorld(true);

    this.scene.add(this.object3D);

    // Create colliders for all meshes
    this.object3D.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry.computeVertexNormals();

        PhysicsUtils.addTrimeshCollider(child, this.world, this.groundColliders, this.scene);
      }
    });
  }
}
