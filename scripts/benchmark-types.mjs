import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { cpus, platform, release, tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

// Run with the packageManager's Bun version. Output is written outside the checkout.
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "34546b6d1042039016a1314f48882e494cc9402a" },
    samples: { type: "string", default: "12" },
    output: { type: "string", default: join(tmpdir(), "git-cors-proxy-types-performance.json") },
  },
});
const root = process.cwd();
const manifest = await Bun.file("package.json").json();
if (`bun@${Bun.version}` !== manifest.packageManager)
  throw new Error(`Use ${manifest.packageManager}`);
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 3)
  throw new Error("Use at least three measured samples");
const fixture = await mkdtemp(join(tmpdir(), "git-cors-types-benchmark-"));

function committed(path) {
  return execFileSync("git", ["show", `${values.base}:${path}`], { encoding: "utf8" });
}

async function run(args, cwd) {
  const started = performance.now();
  const child = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exit !== 0) throw new Error(`${args.join(" ")} failed: ${stdout}${stderr}`);
  const usage = child.resourceUsage();
  return {
    wallMs: performance.now() - started,
    userCpuMs: Number(usage.cpuTime.user) / 1000,
    systemCpuMs: Number(usage.cpuTime.system) / 1000,
    cpuMs: Number(usage.cpuTime.total) / 1000,
    maxRssBytes: usage.maxRSS,
  };
}

function summary(rows, name, field) {
  const values = rows
    .filter((row) => row.name === name)
    .map((row) => row[field])
    .sort((a, b) => a - b);
  return {
    min: values[0],
    median:
      (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2,
    p95: values[Math.ceil(values.length * 0.95) - 1],
    max: values.at(-1),
  };
}

async function pressure() {
  const snapshot = {};
  for (const name of ["cpu", "io", "memory"]) {
    if (platform() === "linux") snapshot[name] = await readFile(`/proc/pressure/${name}`, "utf8");
  }
  return snapshot;
}

try {
  for (const path of ["package.json", "bun.lock", "tsconfig.json", "src/index.ts"]) {
    await Bun.write(join(fixture, path), committed(path));
  }
  const install = await run(
    [process.execPath, "install", "--frozen-lockfile", "--offline"],
    fixture,
  );
  const before = committed("src/index.ts");
  const after = await Bun.file("src/index.ts").text();
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  if (transpiler.transformSync(before) !== transpiler.transformSync(after)) {
    throw new Error("Runtime JavaScript changed");
  }
  const compiler = await Bun.file("node_modules/typescript/package.json").json();
  const baselineCompiler = await Bun.file(
    join(fixture, "node_modules/typescript/package.json"),
  ).json();
  if (compiler.version !== baselineCompiler.version) throw new Error("Compiler versions differ");
  const pressureBefore = await pressure();
  const rows = [];
  // Two warmup pairs, then alternating order to reduce drift from fleet load.
  for (let round = -2; round < samples; round++) {
    for (const name of round % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"]) {
      const result = await run(
        [process.execPath, "run", "typecheck"],
        name === "baseline" ? fixture : root,
      );
      if (round >= 0) rows.push({ round, name, ...result });
    }
  }
  const report = {
    base: values.base,
    bun: Bun.version,
    compiler: compiler.version,
    compilerConcurrency: process.env.GOMAXPROCS ?? "runtime default",
    machine: {
      platform: platform(),
      release: release(),
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
    },
    emittedJavaScriptIdentical: true,
    pressureBefore,
    pressureAfter: await pressure(),
    install,
    samples: rows,
    summary: Object.fromEntries(
      ["baseline", "candidate"].map((name) => [
        name,
        Object.fromEntries(
          ["wallMs", "cpuMs", "userCpuMs", "systemCpuMs", "maxRssBytes"].map((field) => [
            field,
            summary(rows, name, field),
          ]),
        ),
      ]),
    ),
    limitations: [
      "Local compiler measurements, not a universal performance guarantee. Runtime JavaScript is identical.",
      "Wall time includes process startup and scheduling. CPU is child user plus system time. Install is outside measured rounds.",
    ],
  };
  report.measuredComparisonPassed =
    report.summary.candidate.cpuMs.median <= report.summary.baseline.cpuMs.median &&
    report.summary.candidate.wallMs.median <= report.summary.baseline.wallMs.median;
  await Bun.write(values.output, JSON.stringify(report, null, 2) + "\n");
  console.log(values.output);
  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.measuredComparisonPassed) process.exitCode = 1;
} finally {
  await rm(fixture, { recursive: true, force: true });
}
