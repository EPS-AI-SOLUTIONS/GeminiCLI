// Listen for messages from the main thread
self.onmessage = (e: MessageEvent<number>) => {
  const iterations = e.data;
  let primesFound = 0;
  let currentNum = 2;

  // Simulate heavy calculation (finding Nth prime)
  // We report progress every 10%
  const reportInterval = Math.floor(iterations / 10);

  while (primesFound < iterations) {
    if (isPrime(currentNum)) {
      primesFound++;

      if (primesFound % reportInterval === 0) {
        self.postMessage({ type: 'progress', value: (primesFound / iterations) * 100 });
      }
    }
    currentNum++;
  }

  self.postMessage({ type: 'result', value: currentNum - 1 });
};

function isPrime(num: number): boolean {
  for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
    if (num % i === 0) return false;
  }
  return num > 1;
}
