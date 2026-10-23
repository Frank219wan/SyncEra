export function learningProgress(tasks: readonly {done: boolean}[]) {
  const total = tasks.length;
  const done = tasks.filter(task => task.done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round(done / total * 100),
    complete: total > 0 && done === total,
  };
}
