export function nanoid(size = 21) {
  const urlAlphabet = 'useandom-26T198340PX75pxJACKYGoFUHJgVbNisWEdWobaYRGoeCrqytf';
  let id = '';
  let i = size;
  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }
  return id;
}
