// ============================================================================
// Migra archivos de Supabase Storage -> AWS S3, preservando las mismas KEYS.
// Recorre recursivamente cada bucket. Idempotente (re-subir sobrescribe).
//
// Uso (desde la raíz del repo, con node_modules instalado):
//   source deploy/.secrets/source.env
//   export S3_BUCKET_PREFIX="mydymond-<ACCOUNT>-"  AWS_REGION="us-east-2"
//   AWS_PROFILE=mydymond node deploy/migrate-storage.mjs
// ============================================================================
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const SUPA_URL = process.env.SRC_SUPABASE_URL
const SUPA_KEY = process.env.SRC_SUPABASE_SERVICE_ROLE_KEY
const PREFIX   = process.env.S3_BUCKET_PREFIX
const REGION   = process.env.AWS_REGION || 'us-east-2'
const BUCKETS  = (process.env.SRC_BUCKETS || 'uploads ad-creatives broadcast-images social-media course-videos').split(/\s+/).filter(Boolean)

if (!SUPA_URL || !SUPA_KEY || !PREFIX) {
  console.error('Faltan env: SRC_SUPABASE_URL / SRC_SUPABASE_SERVICE_ROLE_KEY / S3_BUCKET_PREFIX')
  process.exit(1)
}

const supa = createClient(SUPA_URL, SUPA_KEY)
const s3 = new S3Client({ region: REGION })

async function* walk(bucket, prefix = '') {
  let offset = 0
  const PAGE = 100
  for (;;) {
    const { data, error } = await supa.storage.from(bucket).list(prefix, {
      limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    if (!data || data.length === 0) break
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        yield* walk(bucket, full)          // es carpeta -> recursión
      } else {
        yield full                          // es archivo
      }
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
}

let totalOk = 0, totalErr = 0
for (const logical of BUCKETS) {
  const dest = `${PREFIX}${logical}`
  console.log(`\n== ${logical}  ->  ${dest} ==`)
  let n = 0
  try {
    for await (const key of walk(logical)) {
      try {
        const { data, error } = await supa.storage.from(logical).download(key)
        if (error) throw error
        const body = Buffer.from(await data.arrayBuffer())
        const contentType = data.type || undefined
        await s3.send(new PutObjectCommand({ Bucket: dest, Key: key, Body: body, ContentType: contentType }))
        n++; totalOk++
        if (n % 50 === 0) console.log(`  ${n} archivos...`)
      } catch (e) {
        totalErr++
        console.error(`  ✗ ${key}: ${e?.message || e}`)
      }
    }
    console.log(`  ${logical}: ${n} archivos copiados`)
  } catch (e) {
    console.error(`  bucket ${logical} falló: ${e?.message || e} (¿no existe en Supabase? se ignora)`)
  }
}
console.log(`\n== FIN ==  ok=${totalOk}  errores=${totalErr}`)
process.exit(totalErr > 0 ? 1 : 0)
