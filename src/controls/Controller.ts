export interface Controller {
  // Primary movement
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;

  // Special actions
  caveman: boolean; // get on/off board
  push: boolean;

  // Extra/Modifiers
  Left: boolean;
  Right: boolean;
  Up: boolean;
  Down: boolean;
}
