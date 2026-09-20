import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock pour HTMLCanvasElement.getContext('2d') dans l'environnement JSDOM
if (typeof window !== 'undefined' && HTMLCanvasElement) {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      scale: () => {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      roundRect: () => {},
      clip: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {}
      })
    } as any;
  };

  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  };

  HTMLCanvasElement.prototype.toBlob = function (callback) {
    const blob = new Blob(['mock-png'], { type: 'image/png' });
    callback(blob);
  };
}
