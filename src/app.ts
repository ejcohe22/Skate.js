import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { Skater } from "./Skater";
import { Skatepark } from "./Skatepark";
import { CameraController } from "./CameraController";
import { KeyboardController } from "./controls/KeyboardController";

export async function initApp() {
  await RAPIER.init();
  const gravity = { x: 0, y: -9.81, z: 0 };
  const world = new RAPIER.World(gravity);
  const eventQueue = new RAPIER.EventQueue(true);

  // Scene
  const scene = new THREE.Scene();

  // Camera
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 5);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Ground
  const skatepark = new Skatepark(world, scene);
  await skatepark.load();

  // --- Grid Helper ---
  //const grid = new THREE.GridHelper(100, 20, 0x444444, 0x888888);
  // size = 100, divisions = 20, dark line color, light line color
  //grid.rotation.x = -Math.PI / 2; // align with plane
  //scene.add(grid);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, .9));
  // Overhead sun
  const sun = new THREE.DirectionalLight(0xffddcc, 10);
  sun.position.set(0, 100, 0);
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  // Optional: enable shadows
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.left = -200;
  sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200;
  sun.shadow.camera.bottom = -200;
  //const light = new THREE.DirectionalLight(0xffffff, 1);
  //light.position.set(5, 10, 7.5);
  //scene.add(light);

  // Player
  const controller = new KeyboardController(true); // USE WASD
  const skater = new Skater(controller, world);
  scene.add(skater.mesh);

  const cameraController = new CameraController(camera, skater);

  // Animate
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    world.step(eventQueue);
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const isGroundContact =
        skatepark.groundColliders.has(handle1) || skatepark.groundColliders.has(handle2);

      if (isGroundContact) {
        if (started) skater.groundContacts++;
        else skater.groundContacts--;
      }

      skater.isGrounded = skater.groundContacts > 0;
    });

    // Update skater (reads input)
    skater.update(delta);

    // Update camera (follows player)
    cameraController.update();

    controller.update();

    // Render
    renderer.render(scene, camera);
  }

  animate();
}
