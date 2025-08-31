import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsUtils {
  /**
   * Create a Rapier convex hull collider from a Three.js Mesh
   * @param mesh Complex volumonous shape
   * @param world RAPIER.World
   * @param collector optional set to store collider handles
   * @param debugScene optional scene to add wireframe around collider
   */
  static addConvexHullCollider(
    mesh: THREE.Mesh,
    world: RAPIER.World,
    collector?: Set<number>,
    debugScene?: THREE.Scene
  ): RAPIER.Collider | null {
    mesh.updateMatrixWorld(true);

    const geo = mesh.geometry.clone();

    if (!geo.attributes.position) {
      console.warn("Mesh has no position attribute, skipping collider:", mesh);
      return null;
    }

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

    // Create a fixed rigid body
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

    // Create convex hull collider
    const colliderDesc = RAPIER.ColliderDesc.convexHull(vertices);
    if (!colliderDesc) {console.log('sad'); return null}

    const collider = world.createCollider(colliderDesc, body);

    if (collector) collector.add(collider.handle);

    // Debug wireframe
    if (debugScene) {
      const debugGeo = new THREE.BufferGeometry();
      debugGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const wireframe = new THREE.LineSegments(debugGeo, material);
      debugScene.add(wireframe);
    }

    return collider;
  }

  static addTrimeshCollider(
    mesh: THREE.Mesh,
    world: RAPIER.World,
    collector?: Set<number>,
    debugScene?: THREE.Scene,
  ): RAPIER.Collider | null {
    mesh.updateMatrixWorld(true);
    const geo = mesh.geometry.clone();
  
    if (!geo.attributes.position) {
      console.warn("Mesh has no position attribute, skipping collider:", mesh);
      return null;
    }
  
    const vertexCount = geo.attributes.position.count;
    const vertices = new Float32Array(vertexCount * 3);
  
    // Apply world transform and small Y offset
    for (let i = 0; i < vertexCount; i++) {
      const vertex = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, i);
      vertex.applyMatrix4(mesh.matrixWorld);
      vertex.y += 0.01; // small offset
      vertices[i * 3 + 0] = vertex.x;
      vertices[i * 3 + 1] = vertex.y;
      vertices[i * 3 + 2] = vertex.z;
    }

  
    // Use indexed triangles if available, otherwise assume consecutive triplets
    let indices: Uint32Array;
    if (geo.index) {
      indices = new Uint32Array(geo.index.array);
    } else {
      if (vertexCount % 3 !== 0) {
        console.warn("Non-indexed mesh vertex count is not divisible by 3, cannot form triangles.");
        return null;
      }
      indices = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) indices[i] = i;
    }
  
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
  
    let collider: RAPIER.Collider;
    try {
      collider = world.createCollider(colliderDesc, body);
    } catch (err) {
      console.error("Failed to create trimesh collider:", err);
      return null;
    }
  
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
