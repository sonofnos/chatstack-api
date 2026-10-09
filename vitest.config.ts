import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // All test files share one Postgres database and each file's beforeEach
    // TRUNCATEs it. Running files in parallel means one file's cleanup can
    // wipe rows another file's in-flight test just inserted. Forcing serial
    // file execution is the honest fix, not a clever workaround.
    fileParallelism: false,
  },
});
