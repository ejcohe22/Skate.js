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
