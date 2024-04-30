export function convertUint8ToFloat32(array) {
  const targetArray = new Float32Array(array.byteLength / 2);

  const sourceDataView = new DataView(array.buffer);

  for (let i = 0; i < targetArray.length; i++) {
    targetArray[i] = sourceDataView.getInt16(i * 2, true) / Math.pow(2, 16 - 1);
  }
  return targetArray;
}

export function convertFloat32ToUint8(array) {
  const buffer = new ArrayBuffer(array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < array.length; i++) {
    const value = (array[i]) * 32768;
    view.setInt16(i * 2, value, true); 
  }

  return new Uint8Array(buffer);
}