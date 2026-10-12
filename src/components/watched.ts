/** how often a title was watched, in words. */
export const watchedText = (count: number) =>
    count === 0
        ? "Not watched yet"
        : count === 1
          ? "Watched once"
          : `Watched ${count} times`;
