import type { Controller } from "./Controller";

export class KeyboardController implements Controller {
  // Movement
  forward = false;
  backward = false;
  left = false;
  right = false;

  // On-board / push
  caveman = false;
  push = false;
  pushPressed = false;

  // Tricks / camera
  trickLeft = false;
  trickRight = false;
  trickUp = false;
  trickDown = false;

  // Maps
  private movementMap: Record<string, string>;
  private specialMap: Record<string, string>;
  private trickMap: Record<string, string>;

  // Internal bookkeeping
  private pressedThisFrame: Set<string> = new Set();

  constructor(useWasd = true) {
    this.movementMap = useWasd
      ? { forward: "w", backward: "s", left: "a", right: "d" }
      : { forward: "ArrowUp", backward: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

    this.specialMap = { caveman: "c", push: " " }; // same for both

    this.trickMap = useWasd
      ? { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown" }
      : { left: "a", right: "d", up: "w", down: "s" };

    window.addEventListener("keydown", (e) => this.handleKey(e, true));
    window.addEventListener("keyup", (e) => this.handleKey(e, false));
  }

  private handleKey(e: KeyboardEvent, down: boolean) {
    // Movement
    if (e.key === this.movementMap.forward) this.forward = down;
    if (e.key === this.movementMap.backward) this.backward = down;
    if (e.key === this.movementMap.left) this.left = down;
    if (e.key === this.movementMap.right) this.right = down;

    // Special
    if (e.key === this.specialMap.caveman) this.caveman = down;
    if (e.key === this.specialMap.push) {
      if (down && !this.push) this.pressedThisFrame.add("push");
      this.push = down;
    }

    // Tricks / camera
    if (e.key === this.trickMap.left) this.trickLeft = down;
    if (e.key === this.trickMap.right) this.trickRight = down;
    if (e.key === this.trickMap.up) this.trickUp = down;
    if (e.key === this.trickMap.down) this.trickDown = down;
  }

  // Call this once per game tick to refresh one-frame flags
  public update() {
    this.pushPressed = this.pressedThisFrame.has("push");

    this.pressedThisFrame.clear();
  }
}
