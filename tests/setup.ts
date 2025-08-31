import { vi } from "vitest";
import * as THREE from "three";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  return {
    ...actual,
    TextureLoader: class {
      load(url: string, onLoad?: (texture: THREE.Texture) => void) {
        const dummyTexture = new THREE.Texture();
        if (onLoad) setTimeout(() => onLoad(dummyTexture), 0);
        return dummyTexture;
      }
      loadAsync = async (url: string) => new THREE.Texture();
    },
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setSize() {}
      render() {}
    },
  };
});

vi.mock("three/examples/jsm/loaders/MTLLoader", () => {
  return {
    MTLLoader: class {
      preload() {}
      load(path: string, onLoad: (m: any) => void) {
        setTimeout(() => onLoad({ preload: () => {} }), 0);
      }
      loadAsync = async () => ({ preload: () => {} });
    },
  };
});

vi.mock("three/examples/jsm/loaders/OBJLoader", () => {
  return {
    OBJLoader: class {
      setMaterials() {
        return this;
      }
      load(path: string, onLoad: (obj: any) => void) {
        setTimeout(() => {
          const group = new THREE.Group();
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
          group.add(mesh);
          onLoad(group);
        }, 0);
      }
      loadAsync = async () => {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        group.add(mesh);
        return group;
      };
    },
  };
});

vi.mock("three/examples/jsm/loaders/GLTFLoader", () => {
  return {
    GLTFLoader: class {
      load(
        path: string,
        onLoad: (gltf: any) => void,
        onProgress?: (event: any) => void,
        onError?: (event: any) => void,
      ) {
        const mockScene = new THREE.Object3D();
        // Optional: add a mock mesh child if your code expects it
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial(),
        );
        mesh.name = "MockMesh";
        mockScene.add(mesh);

        setTimeout(() => {
          onLoad({ scene: mockScene });
        }, 0);
      }

      async loadAsync(path: string) {
        const mockScene = new THREE.Object3D();
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial(),
        );
        mesh.name = "MockMesh";
        mockScene.add(mesh);

        return { scene: mockScene };
      }
    },
  };
});
