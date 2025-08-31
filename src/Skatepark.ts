import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PhysicsUtils } from "./lib/PhysicsUtils";

export class Skatepark {
  public object3D: THREE.Object3D | null = null;
  public groundColliders: Set<number> = new Set();

  constructor(
    private world: RAPIER.World,
    private scene: THREE.Scene,
    // vite serves any thing in "public" as root directory :)
    private assetPath: string = "/Skate.js/assets/southbank-undercroft-skatepark/source/Exports/",
  ) {
    this.world = world;
    this.scene = scene;
    this.assetPath = assetPath;
  }

  /**
   * Load the skatepark model and hook up colliders
   */
  async load(): Promise<void> {
    const mtlLoader = new MTLLoader();
    const materials = await new Promise<any>((resolve, reject) => {
      mtlLoader.load(
        `${this.assetPath}SouthbankSkatePark02.mtl`,
        (m) => resolve(m),
        undefined,
        reject,
      );
    });
    materials.preload();

    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);

    this.object3D = await new Promise<THREE.Object3D>((resolve, reject) => {
      objLoader.load(
        `${this.assetPath}SouthbankSkatePark02.obj`,
        (o) => resolve(o),
        undefined,
        reject,
      );
    });

    // Position / scale adjustments
    this.object3D.scale.set(8,8,8); // adjust if needed
    this.object3D.position.set(0, -10, 0);
    this.object3D.rotation.x = -Math.PI / 2; 
    this.object3D.updateMatrixWorld(true);

    this.scene.add(this.object3D);

    this.object3D.traverse((child: any) => {
        if (child.isMesh) {
          const mat = child.material;
          mat.map = mat.map || new THREE.TextureLoader().load('/Skate.js/assets/southbank-undercroft-skatepark/source/Exports/SouthbankSkatePark02_u1_v1.jpg');
          mat.color.set(0xffffff);   // reset color to white to show texture correctly
          mat.needsUpdate = true;
        }
      });

    // Create colliders for all meshes
    this.object3D.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry.computeVertexNormals();
  

        PhysicsUtils.addTrimeshCollider(child, this.world, this.groundColliders);
      }
    });
  }
}
