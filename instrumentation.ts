// Next.js runs register() once when the server process starts. We use it to
// boot the in-process standing-errand scheduler (Node runtime only). It self-
// gates on DEMO_MANDATE / ENABLE_SCHEDULER, so this is a no-op in environments
// where it shouldn't fire.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
