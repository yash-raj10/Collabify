/*eslint-disable @typescript-eslint/no-explicit-any */
export const throttle = (fn: (...args: any[]) => void, delay: number) => {
  let timeFlag: ReturnType<typeof setTimeout> | null = null;

  return (...args: any[]) => {
    if (timeFlag === null) {
      fn(...args);
      timeFlag = setTimeout(() => {
        timeFlag = null;
      }, delay);
    }
  };
};

export const debounce = (fn: (...args: any[]) => void, delay: number) => {
  let timeFlag: ReturnType<typeof setTimeout> | null = null;

  return (...args: any[]) => {
    if (timeFlag !== null) {
      clearTimeout(timeFlag);
    }
    timeFlag = setTimeout(() => {
      fn(...args);
      timeFlag = null;
    }, delay);
  };
};
