import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const banks = JSON.parse(fs.readFileSync('./data/bank.json', 'utf8'))
const SIZE = 128
const DEFAULT_SVG = './source/Default Bank.svg'
const REPO = 'https://cdn.jsdelivr.net/gh/Onowomano/moniepal-bank-logos@main'

fs.mkdirSync('./dist', { recursive: true })

for (const [currency, data] of Object.entries(banks)) {
  const currencyFolder = currency.toLowerCase()
  const liveBanks = []

  for (const [categoryKey, categoryBanks] of Object.entries(data.categories)) {
    // convert category key: commercial_banks → commercial-banks
    const categoryFolder = categoryKey.replace(/_/g, '-')
    const outputDir = `./logos/${currencyFolder}`
    fs.mkdirSync(outputDir, { recursive: true })

    for (const bank of categoryBanks) {
      const svgPath = `./source/${currencyFolder}/${categoryFolder}/${bank.name}.svg`
      const outputFilename = `${bank.name} - ${bank.bankCode}.png`
      const outputPath = path.join(outputDir, outputFilename)

      const sourceSvg = fs.existsSync(svgPath) ? svgPath : DEFAULT_SVG

      if (!fs.existsSync(svgPath)) {
        console.warn(`⚠️  No SVG for "${bank.name}" in ${categoryFolder} — using default`)
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

      // build the CDN URL for this bank
      const encodedFilename = encodeURIComponent(outputFilename)
      const logoUrl = `${REPO}/logos/${currencyFolder}/${encodedFilename}`

      liveBanks.push({
        name: bank.name,
        aliases: bank.aliases ?? [],
        bankCode: bank.bankCode,
        scCode: bank.scCode ?? null,
        category: categoryKey,
        logo: logoUrl
      })
    }
  }

  // sort alphabetically by name
  liveBanks.sort((a, b) => a.name.localeCompare(b.name))

  // write the dist JSON for this currency
  const distPath = `./dist/live_banks_${currency}.json`
  fs.writeFileSync(distPath, JSON.stringify(liveBanks, null, 2))
  console.log(`\n📄 Generated ${distPath} with ${liveBanks.length} banks`)
}

console.log('\n🎉 Export complete')