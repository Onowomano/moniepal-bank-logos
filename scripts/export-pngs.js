import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const banks = JSON.parse(fs.readFileSync('./data/bank.json', 'utf8'))
const SIZE = 500
const DEFAULT_SVG = './source/Default Bank.svg'
const REPO = 'https://cdn.jsdelivr.net/gh/Onowomano/moniepal-bank-logos@main'

// Detects the red question-mark placeholder SVG by two structural signals that are
// identical across all known variants: the #DDDBDB circular border path and the
// #FF0000 question mark fill. Coordinates on the ? glyph vary between Figma exports
// so we do not match on those.
function isQuestionMarkPlaceholder(svgPath) {
  try {
    const content = fs.readFileSync(svgPath, 'utf8')
    return (
      content.includes('fill="#DDDBDB"') &&
      content.includes('fill="#FF0000"')
    )
  } catch {
    return false
  }
}

fs.mkdirSync('./dist', { recursive: true })

for (const [currency, data] of Object.entries(banks)) {
  const currencyFolder = currency.toLowerCase()
  const liveBanks = []
  const usedFilenames = new Set()

  for (const [categoryKey, categoryBanks] of Object.entries(data.categories)) {
    // convert category key: commercial_banks → commercial-banks
    const categoryFolder = categoryKey.replace(/_/g, '-')
    const outputDir = `./logos/${currencyFolder}`
    fs.mkdirSync(outputDir, { recursive: true })

    for (const bank of categoryBanks) {
      const namesvgPath = `./source/${currencyFolder}/${categoryFolder}/${bank.name}.svg`
      let sourceSvg = DEFAULT_SVG
      let matchedAlias = null

      if (fs.existsSync(namesvgPath) && !isQuestionMarkPlaceholder(namesvgPath)) {
        sourceSvg = namesvgPath
      } else {
        for (const alias of (bank.aliases ?? [])) {
          const aliasSvgPath = `./source/${currencyFolder}/${categoryFolder}/${alias}.svg`
          if (fs.existsSync(aliasSvgPath) && !isQuestionMarkPlaceholder(aliasSvgPath)) {
            sourceSvg = aliasSvgPath
            matchedAlias = alias
            break
          }
        }
      }

      if (sourceSvg === DEFAULT_SVG) {
        console.warn(`⚠️  No SVG for "${bank.name}" in ${categoryFolder} — using default`)
      } else if (matchedAlias) {
        console.warn(`⚠️  "${bank.name}" matched via alias "${matchedAlias}"`)
      }

      // deduplicate output filename within this currency folder
      let outputFilename = `${bank.name}.png`
      if (usedFilenames.has(outputFilename)) {
        outputFilename = `${bank.name}-1.png`
      }
      usedFilenames.add(outputFilename)

      const outputPath = path.join(outputDir, outputFilename)

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