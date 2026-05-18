import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const banks = JSON.parse(fs.readFileSync('./data/bank.json', 'utf8'))
const SIZE = 128
const DEFAULT_SVG = './source/Default Bank.svg'

// iterate over each currency (NGN, GHS, RWF etc.)
for (const [currency, data] of Object.entries(banks)) {
  const currencyFolder = currency.toLowerCase() // "ngn", "rwf" etc.
  const outputDir = `./logos/${currencyFolder}`
  fs.mkdirSync(outputDir, { recursive: true })

  // flatten all categories into one array
  const allBanks = Object.values(data.categories).flat()

  for (const bank of allBanks) {
    const svgPath = `./source/${currencyFolder}/${bank.name}.svg`
    const outputFilename = `${bank.name} - ${bank.bankCode}.png`
    const outputPath = path.join(outputDir, outputFilename)

    // use the bank's own SVG if it exists, otherwise fall back to default
    const sourceSvg = fs.existsSync(svgPath) ? svgPath : DEFAULT_SVG

    if (!fs.existsSync(svgPath)) {
      console.warn(`⚠️  No SVG found for "${bank.name}" — using default`)
    }

    try {
      await sharp(sourceSvg)
        .resize(SIZE, SIZE)
        .png()
        .toFile(outputPath)

      console.log(`✅ ${currency} — ${bank.name} (${bank.bankCode})`)
    } catch (err) {
      console.error(`❌ Failed to export "${bank.name}": ${err.message}`)
    }
  }
}

console.log('\n🎉 Export complete')