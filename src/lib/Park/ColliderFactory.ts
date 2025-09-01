import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { DebugOptions } from "./Types";

/**
 * Create colliders for meshes.
 * Heuristics:
 *  - If user picks "box", build box.
 *  - If geometry is simple (few verts) -> convexHull.
 *  - If geometry is indexed and dense -> trimesh (use cautiously).
 *
 * This class centralizes Rapier-specific knowledge so ParkBuilder stays clean.
 */
export class ColliderFactory {
  constructor(private world: RAPIER.World, private debug: DebugOptions = {}) {}

  createForMesh(mesh: THREE.Mesh, options?: { type?: "auto" | "box" | "convex" | "trimesh"; isStatic?: boolean }) {
    mesh.updateMatrixWorld(true);

    const type = options?.type ?? "auto";
    const isStatic = options?.isStatic ?? true;

    if (type === "box") return this._createBox(mesh, isStatic);
    if (type === "convex") return this._createConvex(mesh, isStatic);
    if (type === "trimesh") return this._createTrimesh(mesh, isStatic);

    // AUTO heuristic
    const geom = mesh.geometry as THREE.BufferGeometry;
    const vertCount = (geom.attributes.position?.count) ?? 0;
    const index = geom.index;

    // very simple: tiny -> convex, large indexed -> trimesh, otherwise box
    if (vertCount <= 32) return this._createConvex(mesh, isStatic);
    if (index && vertCount > 256) return this._createTrimesh(mesh, isStatic);
    // fall back to convex hull for medium detail
    return this._createConvex(mesh, isStatic);
  }

  createForObject(obj: THREE.Object3D, options?: { type?: "auto" | "box" | "convex" | "trimesh"; isStatic?: boolean }) {
    const type = options?.type ?? "auto";
    const isStatic = options?.isStatic ?? true;

    if (obj instanceof THREE.Group) {
      const results : { body: RAPIER.RigidBody; collider: RAPIER.Collider }[] = [] ;
      obj.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          results.push(this.createForMesh(child, options));
        }
      });
      return results;
    } else if (obj instanceof THREE.Mesh) {
      return [this.createForMesh(obj, options)];
    } else {
      return [];
    }
  }

  private _createBox(mesh: THREE.Mesh, isStatic: boolean) {
    const box = new THREE.Box3().setFromObject(mesh);
    const sx = (box.max.x - box.min.x) / 2;
    const sy = (box.max.y - box.min.y) / 2;
    const sz = (box.max.z - box.min.z) / 2;

    const pos = mesh.getWorldPosition(new THREE.Vector3());
    const rot = mesh.getWorldQuaternion(new THREE.Quaternion());

    const bodyDesc = (isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(new RAPIER.Quaternion(rot.x, rot.y, rot.z, rot.w));

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(sx, sy, sz);
    const collider = this.world.createCollider(colliderDesc, body);

    if (this.debug.logColliders) console.log("Box collider created", { mesh: mesh.name, handle: collider.handle });
    return { body, collider };
  }

  private _createConvex(mesh: THREE.Mesh, isStatic: boolean) {
    // extract world-space vertices
    const positions = this._extractWorldVertices(mesh);
    if (positions.length === 0) throw new Error("No vertices for convex hull");

    // Rapier expects Float32Array input for convex hull: flatten [x,y,z,...]
    const flat = new Float32Array(positions.length * 3);
    for (let i = 0; i < positions.length; i++) {
      const v = positions[i]!;
      flat[i*3 + 0] = v.x;
      flat[i*3 + 1] = v.y;
      flat[i*3 + 2] = v.z;
    }

    const pos = mesh.getWorldPosition(new THREE.Vector3());
    const rot = mesh.getWorldQuaternion(new THREE.Quaternion());
    const bodyDesc = (isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(new RAPIER.Quaternion(rot.x, rot.y, rot.z, rot.w));
    const body = this.world.createRigidBody(bodyDesc);

    let colliderDesc: RAPIER.ColliderDesc;
    try {
      colliderDesc = RAPIER.ColliderDesc.convexHull(flat)!;
    } catch (err) {
      // fallback to box if convex hull generation fails
      console.warn("Convex hull generation failed, falling back to box for", mesh.name, err);
      return this._createBox(mesh, isStatic);
    }

    const collider = this.world.createCollider(colliderDesc, body);
    if (this.debug.logColliders) console.log("Convex collider created", { mesh: mesh.name, handle: collider.handle });
    return { body, collider };
  }

  private _createTrimesh(mesh: THREE.Mesh, isStatic: boolean) {
    const geom = mesh.geometry as THREE.BufferGeometry;
    if (!geom.index) {
      console.warn("Non-indexed geometry cannot be used for trimesh reliably. Convert to indexed first:", mesh.name);
      return this._createConvex(mesh, isStatic);
    }

    const positions = this._extractWorldVertices(mesh);
    const flat = new Float32Array(positions.length * 3);
    for (let i = 0; i < positions.length; i++) {
      const v = positions[i]!;
      flat[i*3 + 0] = v.x;
      flat[i*3 + 1] = v.y;
      flat[i*3 + 2] = v.z;
    }

    // indices: copy index buffer but ensure it's Uint32Array
    const idxAttr = geom.index!;
    const indices = new Uint32Array(idxAttr.array as any);

    const pos = mesh.getWorldPosition(new THREE.Vector3());
    const rot = mesh.getWorldQuaternion(new THREE.Quaternion());
    const bodyDesc = (isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(new RAPIER.Quaternion(rot.x, rot.y, rot.z, rot.w));
    const body = this.world.createRigidBody(bodyDesc);

    let collider: RAPIER.Collider;
    try {
      const colliderDesc = RAPIER.ColliderDesc.trimesh(flat, indices);
      collider = this.world.createCollider(colliderDesc, body);
    } catch (err) {
      console.error("Trimesh collider creation failed, falling back to convex hull", err);
      const fallback = this._createConvex(mesh, isStatic);
      return fallback;
    }

    if (this.debug.logColliders) console.log("Trimesh collider created", { mesh: mesh.name, handle: collider.handle });
    return { body, collider };
  }

  // Helpers
  private _extractWorldVertices(mesh: THREE.Mesh): THREE.Vector3[] {
    const geom = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return [];
    const out: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr as any, i);
      v.applyMatrix4(mesh.matrixWorld);
      out.push(v.clone());
    }
    return out;
  }

  private _addMeshWireframe(mesh: THREE.Mesh) {
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: 0xff00ff })
    );
    wire.matrixAutoUpdate = false;
    wire.matrix.copy(mesh.matrixWorld);
    mesh.parent?.add(wire);
  }

  private _addWireframeBox(mesh: THREE.Mesh, sx: number, sy: number, sz: number) {
    const geo = new THREE.BoxGeometry(sx*2, sy*2, sz*2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
    const wire = new THREE.Mesh(geo, mat);
    const pos = mesh.getWorldPosition(new THREE.Vector3());
    wire.position.copy(pos);
    mesh.parent?.add(wire);
  }
}