import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

import { ParkBuilder } from "./lib/Park/ParkBuilder";
import * as Prefabs from "./lib/Park/Prefabs";

export class Skatepark {
  private debugOpts = { showColliders: true, logColliders: true, showWireframes: true };
  public builder : ParkBuilder;

  constructor(public scene: THREE.Scene, private world: RAPIER.World){
    this.builder = new ParkBuilder(scene, world, this.debugOpts);
    this.buildPieces();
  }

  buildPieces(){
    // main two platforms 
    const pA = Prefabs.createPlatformPiece(15, 10, 2, 0xffffcc);
    pA.mesh.position.set(0, 1, 0); // place A
    this.builder.addPiece(pA, "box", true);

    const pB = Prefabs.createPlatformPiece(15, 20, 2, 0xccffcc );
    pB.mesh.position.set(15, 1, 5); // place B
    this.builder.addPiece(pB, "box", true);

    // triangular ramps that lead up to platforms
    const rampA = Prefabs.createTriangularRamp(10, 3, 2, 0xffff00);
    this.builder.addPiece(rampA, "convex", true);
    this.builder.snapPieceTo(rampA, pA, 0, 0);
    //this.builder.showSnapPoints(rampA);

    // stairs with hubba, snap to platform B edge
    const stairs = Prefabs.createStairsWithHubba(4, 6, .9, .5, 0x00ff00);
    this.builder.addPiece(stairs, "box", true);
    this.builder.snapPieceTo(stairs, pB, 2, 2);
  }
}

