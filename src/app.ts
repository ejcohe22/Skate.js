import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { Skater } from "./Skater";
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
  const planeGeom = new THREE.PlaneGeometry(100, 100);
  const planeMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const plane = new THREE.Mesh(planeGeom, planeMat);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  // --- Grid Helper ---
  const grid = new THREE.GridHelper(100, 20, 0x444444, 0x888888); 
  // size = 100, divisions = 20, dark line color, light line color
  //grid.rotation.x = -Math.PI / 2; // align with plane
  scene.add(grid);

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.cuboid(50, 0.1, 50), groundBody);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 7.5);
  scene.add(light);

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
