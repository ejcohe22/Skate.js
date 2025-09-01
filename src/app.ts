import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { Skater } from "./Skater";
import { Environment } from "./Environment";
import { CameraController } from "./CameraController";
import { KeyboardController } from "./lib/Controls/KeyboardController";

export async function initApp() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Build World
  await RAPIER.init();
  const gravity = { x: 0, y: -9.81, z: 0 };
  const world = new RAPIER.World(gravity);
  const eventQueue = new RAPIER.EventQueue(true);

  // Fill it with stuff
  const scene = new THREE.Scene();
  const environment = new Environment(scene, world, 300, 300);
  environment.setupDefaultLighting();
  environment.setSkyColor(0x1177ee);

  // USE WASD
  const is_regular = true;
  const controller = new KeyboardController(is_regular);

  // Player
  const skater = new Skater(controller, world);
  scene.add(skater.mesh);

  // Camera
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 5);
  const cameraController = new CameraController(camera, skater);

  // GAME LOOP
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
  
    // oh no, what are you doing step-physics
    world.step(eventQueue);
  
    // Ground collision detection
    eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (environment.groundColliders.has(h1) || environment.groundColliders.has(h2)) {
        if (started) skater.groundContacts++;
        else skater.groundContacts--;
      }
    });
    skater.isGrounded = skater.groundContacts > 0;
    console.log(skater.isGrounded)

    skater.update(delta);
    cameraController.update();
    controller.update();
    renderer.render(scene, camera);
  }

  animate();
}
