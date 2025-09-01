import * as THREE from "three";
import type { IParkPiece, ISnapPoint } from "./Types";

/** Helper: wrap a position + optional rotation into an ISnapPoint */
function snap(pos: THREE.Vector3, rot?: THREE.Quaternion): ISnapPoint {
  if (!rot) return { position: pos };

  return { position: pos, rotation: rot }
}

// --- Platform ---
export function createPlatformPiece(width = 4, depth = 4, height = 0.4, color = 0x888888): IParkPiece {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.set(0, 0, 0);

  const piece: IParkPiece = {
    id: `platform_${width}x${depth}_${height}`,
    mesh,
    snapPoints: [
      snap(new THREE.Vector3(-width/2, -height/2, depth/2)),   // front-bottom-left
      snap(new THREE.Vector3(width/2, -height/2, depth/2)),    // front-bottom-right
      snap(new THREE.Vector3(-width/2, -height/2, -depth/2)),  // back-bottom-left
      snap(new THREE.Vector3(width/2, -height/2, -depth/2)),   // back-bottom-right
      snap(new THREE.Vector3(-width/2, height/2, depth/2)),    // front-top-left
      snap(new THREE.Vector3(width/2, height/2, depth/2)),     // front-top-right
      snap(new THREE.Vector3(-width/2, height/2, -depth/2)),   // back-top-left
      snap(new THREE.Vector3(width/2, height/2, -depth/2)),    // back-top-right
    ],
    tag: "park",
    size: new THREE.Vector3(width, height, depth),
    snapTo(worldPos, worldQuat) { mesh.position.copy(worldPos); if (worldQuat) mesh.quaternion.copy(worldQuat); }
  };
  return piece;
}

// --- Triangular Ramp ---
export function createTriangularRamp(
    width = 2,
    depth = 2,
    height = 1,
    color = 0x666666
  ): IParkPiece {
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -width/2, 0, 0,  width/2, 0, 0,  width/2, 0, depth,  -width/2, 0, depth,
      -width/2, height, 0,  width/2, height, 0
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex([
      0,1,2, 0,2,3,  0,4,5, 0,5,1,  1,5,2,  3,2,5, 3,5,4
    ]);
    geo.computeVertexNormals();
  
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
  
    const piece: IParkPiece = {
      id: `ramp_${width}x${depth}x${height}`,
      mesh,
      snapPoints: [
        // Bottom corners
        snap(new THREE.Vector3(-width/2, 0, 0)),        // back-bottom-left
        snap(new THREE.Vector3(width/2, 0, 0)),         // back-bottom-right
        snap(new THREE.Vector3(width/2, 0, depth)),     // front-bottom-right
        snap(new THREE.Vector3(-width/2, 0, depth)),    // front-bottom-left

        // Top corners
        snap(new THREE.Vector3(-width/2, height, 0)),   // top-left
        snap(new THREE.Vector3(width/2, height, 0)),    // top-right
      ],
      tag: "park",
      size: new THREE.Vector3(width, height, depth),
      snapTo(worldPos, worldQuat) {
        mesh.position.copy(worldPos);
        if (worldQuat) mesh.quaternion.copy(worldQuat);
      }
    };
  
    return piece;
  }

// --- Stairs with Hubba ---
export function createStairsWithHubba(steps = 3, stepWidth = 2, stepDepth = 0.6, stepHeight = 0.25, color = 0x777777) : IParkPiece {
  const group = new THREE.Group();
  const totalDepth = steps * stepDepth;
  for (let i = 0; i < steps; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), new THREE.MeshStandardMaterial({ color }));
    g.position.set(0, (i + 0.5) * stepHeight, i * stepDepth - totalDepth/2 + stepDepth/2);
    group.add(g);
  }
  const hubba = new THREE.Mesh(new THREE.BoxGeometry(0.3, stepHeight*steps, totalDepth), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  hubba.position.set(-stepWidth/2 - 0.15, (steps*stepHeight)/2, 0);
  group.add(hubba);

  group.castShadow = group.receiveShadow = true;

  const lastStepZ = totalDepth/2;
  const piece: IParkPiece = {
    id: `stairs_${steps}`,
    mesh: group as unknown as THREE.Mesh,
    snapPoints: [
        snap(new THREE.Vector3((-stepWidth/2 -.3), 0, -lastStepZ)), // back-bottom-left
        snap(new THREE.Vector3(stepWidth/2, 0, -lastStepZ)),  // back-bottom-right
        snap(new THREE.Vector3(stepWidth/2, 0, lastStepZ)),   // front-bottom-right
        snap(new THREE.Vector3((-stepWidth/2 -.3), 0, lastStepZ)),  // front-bottom-left
  
        // Top corners
        snap(new THREE.Vector3((-stepWidth/2 -.3), steps * stepHeight, lastStepZ)), // top-left
        snap(new THREE.Vector3(stepWidth/2, steps * stepHeight, lastStepZ)),  // top-right
    ],
    tag: "park",
    size: new THREE.Vector3(stepWidth, steps*stepHeight, totalDepth),
    snapTo(worldPos, worldQuat) { group.position.copy(worldPos); if (worldQuat) group.quaternion.copy(worldQuat); }
  };

  return piece;
}