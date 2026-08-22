import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cotejaRun } from './pipeline/run.js'
import { renderMarkdownPacket } from './report/markdownPacket.js'
import { loadDossier } from './dossier/loadDossier.js'
import { runBench } from './bench/runner.js'
import { runSelfTest } from './selftest.js'

function usage(): never {
  process.stdout.write(
    [
      'Coteja — offline trade-finance document checker',
      '',
      'usage:',
      '  npm run coteja -- --selftest              schema + merge sanity checks (no models)',
      '  npm run coteja -- <dossier-dir>           check one dossier, print evidence packet',
      '  npm run coteja -- --bench <runs>          benchmark every dossier in dossiers/',
      '',
      'options:',
      '  --out <dir>    where packets/bench reports are written (default: reports)',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0) usage()

  const outIdx = args.indexOf('--out')
  const outDir = outIdx !== -1 ? (args[outIdx + 1] ?? 'reports') : 'reports'

  if (args[0] === '--selftest') {
    runSelfTest()
    return
  }

  if (args[0] === '--bench') {
    const runs = Number(args[1] ?? 3)
    if (!Number.isFinite(runs) || runs < 1) {
      process.stdout.write('--bench expects a positive number of runs\n')
      process.exit(1)
    }
    const baseDir = join(process.cwd(), 'dossiers')
    const dirs = readdirSync(baseDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(baseDir, e.name))
      .filter((d) => existsManifest(d))
    if (dirs.length === 0) {
      process.stdout.write('no dossiers found under dossiers/ (need manifest.json)\n')
      process.exit(1)
    }
    process.stdout.write(`▸ benchmarking ${dirs.length} dossiers × ${runs} runs, sequential\n`)
    const result = await runBench(dirs, runs)
    mkdirSync(outDir, { recursive: true })
    const benchPath = join(outDir, 'bench.json')
    writeFileSync(benchPath, JSON.stringify(result, null, 2))
    process.stdout.write(`\n▸ wrote ${benchPath}\n`)
    for (const d of result.dossiers) {
      process.stdout.write(
        `  ${d.dossierId.padEnd(24)} precision=${fmt(d.meanPrecision)} recall=${fmt(d.meanRecall)} consistency=${(d.consistency * 100).toFixed(0)}% median=${Math.round(d.medianTotalMs)}ms\n`,
      )
    }
    return
  }

  const dossierDir = args[0]
  process.stdout.write('▸ Coteja starting — all inference will run locally\n')
  const packet = await cotejaRun(dossierDir)
  const markdown = renderMarkdownPacket(packet)

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, `${packet.dossierId}.packet.json`), JSON.stringify(packet, null, 2))
  const mdPath = join(outDir, `${packet.dossierId}.packet.md`)
  writeFileSync(mdPath, markdown)

  process.stdout.write('\n' + markdown + '\n')
  process.stdout.write(`\n▸ packet written to ${mdPath}\n`)
  process.exit(0)
}

function fmt(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

function existsManifest(dir: string): boolean {
  try {
    readFileSync(join(dir, 'manifest.json'))
    return true
  } catch {
    return false
  }
}

main().catch((error) => {
  process.stderr.write(`✖ ${String(error)}\n`)
  process.exit(1)
})
