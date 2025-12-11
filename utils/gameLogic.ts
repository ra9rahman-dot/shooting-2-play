// Simple collision detection helper
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const checkCollision = (rect1: Rect, rect2: Rect): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};
