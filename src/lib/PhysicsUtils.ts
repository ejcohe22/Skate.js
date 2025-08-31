import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsUtils {
  static addTrimeshCollider(
    mesh: THREE.Mesh,
    world: RAPIER.World,
    collector?: Set<number>,
    debugScene?: THREE.Scene, // optional debug visualization
  ): RAPIER.Collider | null {
    mesh.updateMatrixWorld(true);

    const geo = mesh.geometry.clone();

    if (!geo.attributes.position) {
      console.warn("Mesh has no position attribute, skipping collider:", mesh);
      return null;
    }

    // Apply mesh's world transform to vertices
    mesh.updateMatrixWorld(true);
    const vertexCount = geo.attributes.position.count;
    const vertices = new Float32Array(vertexCount * 3);

    // Apply world transform to vertices
    for (let i = 0; i < vertexCount; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, i);
      vertex.applyMatrix4(mesh.matrixWorld);
      vertices[i * 3 + 0] = vertex.x;
      vertices[i * 3 + 1] = vertex.y;
      vertices[i * 3 + 2] = vertex.z;
    }

    const indices = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) indices[i] = i;

    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const body = world.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
    const collider = world.createCollider(colliderDesc, body);

    if (collector) collector.add(collider.handle);

    // Debug wireframe
    if (debugScene) {
      const debugGeo = new THREE.BufferGeometry();
      debugGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
      const wireframe = new THREE.LineSegments(debugGeo, material);
      debugScene.add(wireframe);
    }

    return collider;
  }
}
