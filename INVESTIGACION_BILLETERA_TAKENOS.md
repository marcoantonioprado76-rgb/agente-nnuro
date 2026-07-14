# Investigación: Cómo crear una billetera tipo Takenos en LATAM

> **Disclaimer metodológico**: este informe se construyó con cutoff de conocimiento enero 2026. No se pudo acceder a web en vivo durante la investigación, por lo que **fees exactos, registros públicos, montos de capital mínimo, plazos regulatorios y rondas de funding deben re-verificarse en fuentes oficiales antes de tomar decisiones de inversión**. Se marca con `(*)` toda cifra que es estimación de mercado vs dato firme. No es asesoramiento legal, financiero ni regulatorio.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Stack técnico](#2-stack-técnico)
3. [Regulación y compliance LATAM](#3-regulación-y-compliance-latam)
4. [Modelo de negocio y unit economics](#4-modelo-de-negocio-y-unit-economics)
5. [Panorama competitivo](#5-panorama-competitivo)
6. [Roadmap recomendado](#6-roadmap-recomendado)
7. [Checklist de verificación previa al lanzamiento](#7-checklist-de-verificación-previa-al-lanzamiento)

---

## 1. Resumen ejecutivo

**Takenos** es una fintech argentina (fundada ~2021-2022) que permite a freelancers y empresas LATAM:

- Recibir USD del exterior (ACH/wire US, Wise, PayPal, Deel)
- Convertirlos a stablecoins (USDC/USDT)
- Retirar a cuentas locales en moneda local (ARS, MXN, COP, BRL, etc.)
- Custodiar cripto y enviar/recibir on-chain

**Clonar este modelo requiere cuatro stacks**:

| Stack | Complejidad | Costo inicial estimado |
|---|---|---|
| Tecnológico (custodia, on/off ramp, KYC, blockchain) | Alta | USD 150-300K setup |
| Regulatorio (licencias por país + AML) | Muy alta | USD 200K-2M según mercados |
| Financiero (banking partners, treasury, liquidez) | Alta | USD 100-500K reservas |
| Operativo (compliance staff, soporte, growth) | Media-Alta | USD 50-150K/mes a escala MVP |

**Capital mínimo realista para arrancar serio**:
- MVP en 1 país (12-18 meses): **USD 1.2-1.8M**
- Expansión regional a 3-5 países (24-36 meses): **USD 8-15M adicionales**

**Tiempo a primer usuario pago**: 6-9 meses con stack 100% partner; 18-30 meses si vas por licencias propias desde día uno.

**El gran insight**: el margen real **no está en los fees declarados** (que son 0% en muchos rieles) sino en el **spread cambiario** entre USD/stablecoin/moneda local. La narrativa al usuario es "barato y transparente"; la realidad económica del operador es 1.5-3% efectivo capturado en FX.

---

## 2. Stack técnico

### 2.1 Arquitectura backend de alto nivel

Las fintechs cripto+fiat LATAM (Takenos, Lemon, Belo, Buenbit, Bitso, Ripio) suelen converger en una arquitectura similar:

```
┌──────────────────────────────────────────────────────────┐
│                    Mobile / Web App                       │
│         (React Native + Expo, Flutter, Next.js)           │
└────────────────┬─────────────────────────────────────────┘
                 │ REST / GraphQL / WebSocket
┌────────────────▼─────────────────────────────────────────┐
│                    API Gateway / BFF                      │
│              (Kong, AWS API Gateway, Nginx)               │
└────────────────┬─────────────────────────────────────────┘
                 │
       ┌─────────┼─────────────┬─────────────┬──────────────┐
       │         │             │             │              │
┌──────▼───┐ ┌──▼─────┐  ┌────▼────┐  ┌────▼─────┐  ┌─────▼────┐
│ Auth /   │ │ KYC    │  │ Ledger  │  │ Custody  │  │ Payments │
│ Identity │ │ Service│  │ (double │  │ Service  │  │ Service  │
│          │ │        │  │  entry) │  │ (cripto) │  │ (fiat)   │
└──────────┘ └────────┘  └─────────┘  └──────────┘  └──────────┘
                              │            │              │
                              ▼            ▼              ▼
                         PostgreSQL    Fireblocks/    Bridge,
                         (ledger,      MPC wallet     Wise, etc.
                         events)       (blockchain)
                              │            │              │
                         ┌────▼────────────▼──────────────▼──┐
                         │   Event bus (Kafka, NATS, Pub/Sub) │
                         └────────────────┬───────────────────┘
                                          │
                       ┌──────────────────┼──────────────────┐
                       ▼                  ▼                  ▼
                  ┌─────────┐       ┌──────────┐      ┌──────────┐
                  │   AML   │       │ Notifica-│      │ Reconcil-│
                  │ Monitor │       │ ciones   │      │ iation   │
                  │ (Chain- │       │ (Twilio, │      │ Engine   │
                  │ alysis) │       │  email)  │      │          │
                  └─────────┘       └──────────┘      └──────────┘
```

**Principios clave del backend**:

1. **Ledger interno double-entry**: cada movimiento de fondos se asienta como dos asientos (débito y crédito). Esto evita inconsistencias y permite reconciliación. Inspirarse en TigerBeetle (Rust, financial-grade) o construir sobre PostgreSQL con extensiones.
2. **Idempotencia obligatoria**: cada operación tiene un `idempotency_key`. Reintentar la misma operación 10 veces no produce 10 transferencias. Stripe estandarizó esto.
3. **Event-driven con outbox pattern**: la base de datos es la fuente de verdad; los eventos se publican via outbox table → CDC (Debezium) → Kafka. Evita el problema de "publiqué evento pero no se commiteó la tx".
4. **Microservicios por bounded context**, no por capa técnica. Servicios típicos: identity, KYC, ledger, custody, payments-in, payments-out, FX, treasury, AML, notifications, support.
5. **API versionada** desde día 1. Aunque sólo sea v1, prepará el header.
6. **State machines explícitas** para cada flow (onboarding, payment, withdraw). Usá XState o construí un FSM con transiciones loggeadas.
7. **Reconciliación automática end-of-day** contra cada partner externo (Bridge, Wise, exchanges, banks).

**Stack tecnológico observado en el sector** (no hay una sola receta):

| Componente | Opciones populares |
|---|---|
| Lenguajes backend | Go (Mercado Pago, Mercury), Node/TypeScript (Belo, Lemon partial), Python (Buenbit, Ripio backend), Elixir (Bitso histórico), Java/Kotlin (Bitso, escalado) |
| Bases de datos | PostgreSQL (default), CockroachDB (multi-región), TimescaleDB (métricas), Redis (cache, locks) |
| Cola/mensajería | Kafka (escala), NATS (más liviano), AWS SQS/SNS, RabbitMQ |
| Búsqueda/analytics | OpenSearch/Elasticsearch, ClickHouse (logs y métricas a escala), BigQuery/Redshift (warehouse) |
| Orquestación | Kubernetes (EKS, GKE), Nomad (más simple), ECS Fargate (managed) |
| Infra como código | Terraform + Atlantis, Pulumi |
| CI/CD | GitHub Actions, CircleCI, Buildkite |
| Observabilidad | Datadog (estándar), Grafana + Prometheus + Loki (DIY), Sentry (errores), PagerDuty (alerting) |

### 2.2 Custodia cripto — la decisión más importante

Las opciones se ordenan por nivel de "self-custody" decreciente:

#### Opción A — Self-custody puro (DIY)

- Llaves privadas guardadas por la empresa en HSM (AWS CloudHSM, Google Cloud HSM, YubiHSM).
- Multi-sig con Gnosis Safe.
- Costo licencia: USD 0. Costo HSM: USD 1-5K/mes.
- **No recomendado para arrancar**: requiere equipo de seguridad senior, errores son catastróficos, no hay seguro estándar.

#### Opción B — MPC managed (recomendado para escala)

Multi-Party Computation: la llave nunca existe completa; se divide en *shards* que firman colaborativamente.

| Provider | Modelo | Costo aproximado(*) | Mejor para |
|---|---|---|---|
| **Fireblocks** | Plataforma + MPC + workflow engine + policy | Setup USD 25-100K + USD 30-200K+/año | Estándar de mercado, casi todos los fintech LATAM serios lo usan |
| **BitGo** | Custodia institucional + trading | 0.15-0.5% AUM/año + fees por tx; mínimo ~USD 50K/año | Más enterprise, regulado en US |
| **Cobo Custody** | MPC + cold/hot/warm wallets | USD 20-80K/año | Alternativa más barata, fuerte en Asia |
| **Anchorage Digital** | Bank-grade (OCC chartered) | USD 100K+/año | Si necesitás banco cripto US qualified |
| **Copper** | MPC + ClearLoop settlement | USD 50K+/año | Más trading-oriented |

#### Opción C — Wallet-as-a-Service (para UX retail)

Si querés que los usuarios tengan "su propia" wallet pero sin gestionar seed phrases:

| Provider | Modelo | Costo | Mejor para |
|---|---|---|---|
| **Privy** | Email/social login → embedded wallet (MPC) | Free hasta ~1K MAU, USD 99-499/mes+ | UX Web3 mainstream, soporta Ethereum + EVMs + Solana |
| **Web3Auth** (ex Torus) | OAuth + threshold cryptography | Free hasta cierto MAU, luego enterprise | Migrá a self-custody real con un click |
| **Dynamic** | Connect kit + embedded wallets | Tier free + paid | Multi-chain, foco en dev experience |
| **Magic Link** | Email-based wallets | USD 0.10-0.25 per MAU | Pionero, ahora menos popular |
| **Turnkey** | KMS-as-a-service para devs | API-based pricing | Si querés más control, menos UI prebuilt |
| **Coinbase Smart Wallet / Account Kit (Alchemy)** | Smart contract accounts (ERC-4337) | Gas + fees variables | Account abstraction nativo |

#### Opción D — Híbrida (la que terminás haciendo)

En la práctica las fintechs maduras usan **Fireblocks/BitGo para el treasury y hot wallets operativas** (donde se mueve el volumen) + **wallets segregadas por usuario** con MPC para casos donde el usuario quiere "su" address fija.

**Recomendación para arrancar**: Fireblocks tier inicial (~USD 40-60K/año) + Privy para wallets de usuario. Cuando crezcas a >50K usuarios activos, reevaluá.

### 2.3 On/off ramp y banking-as-a-service

Aquí es donde se decide si tu MVP sale en 3 meses o en 18.

#### Para recibir USD desde el exterior (cuentas virtuales US)

| Provider | Modelo | Cobertura | Costo aproximado(*) |
|---|---|---|---|
| **Bridge.xyz** (adquirida por Stripe oct-2024) | Cuentas virtuales US (ACH/wire) → USDC auto + payouts LATAM | Global, fuerte LATAM | 0.1-0.5% por tx + setup negociable |
| **Brale** | Stablecoin orchestration + emisión propia | US-first, expandiendo | Similar a Bridge |
| **Conduit** | Cross-border stablecoin payments | LATAM, África | 0.3-1% |
| **Felix Pago** | USA → México vía WhatsApp | Corredor US-MX | Fees fijos |
| **Layer2 Financial / Mural** | B2B payouts en stablecoins | Global | Custom |
| **Mercury / Brex / Relay** | Cuentas business US (banking tradicional) | Solo emprendedores con LLC US | Free tier inicial |
| **Column / Lead Bank / Cross River / Evolve** | Banking-as-a-Service partner | US licensing | Setup USD 25-100K + monthly minimums |

**Lo que cambió post-Stripe-Bridge (oct 2024)**: la adquisición consolidó el mercado pero también subió la barrera para nuevos entrantes. Bridge ahora pivotea hacia clientes Stripe-tier. Para una fintech LATAM en early stage, **Brale, Conduit y bancos partner directos** se volvieron más interesantes.

#### Para mintar/quemar USDC directo

- **Circle Mint**: cuenta Circle institucional permite mint/burn USDC 1:1 contra USD via wire bancario. Free de fees, requiere onboarding compliance significativo (3-6 meses). Es lo que hacen Bitso, Bridge, MoneyGram. Si tu volumen justifica (USD 5M+/mes), vale la pena.

#### Para retirar a cuentas locales LATAM

| Provider | Cobertura | Especialidad |
|---|---|---|
| **dLocal** (uruguayo, Nasdaq) | Toda LATAM + África + Asia | B2B, alto volumen, pricing enterprise |
| **EBANX** | LATAM | Cards + bank transfers |
| **Kushki** | LATAM | Más payment processor que rampa |
| **Belvo** | MX, BR, CO + apertura cuentas SPEI/PIX | Open finance + payments |
| **Manteca** | Argentina | Cripto on/off ramp local, vía bancos AR |
| **Koywe** | Chile, México, Colombia | Stablecoin on/off ramp B2B |
| **Stark Bank, Asaas, Iugu, Transfero** | Brasil | PIX-native APIs |
| **STP, Arcus** | México | SPEI |
| **Movii, Daviplata, Nequi** | Colombia | Wallets locales |
| **Fintoc, Khipu** | Chile | PIX-like Chileno |

#### Para emitir tarjetas debit/prepaid

| Provider | Cobertura | Modelo |
|---|---|---|
| **Pomelo** (argentino) | LATAM completo | Issuing + processing, fuerte en region |
| **Conductor** (brasileño) | LATAM | Similar, más maduro |
| **Galileo Financial** | US + parcial LATAM | Issuing veterano |
| **Marqeta** | Global | Más enterprise |
| **Lithic** | US | Card issuing API-first |
| **Highnote** | US | Modern card platform |

Para LATAM: **Pomelo es default**. Bridge.xyz tiene también card issuing post-Stripe.

### 2.4 KYC / KYB

Verificación de identidad obligatoria. Variables clave: precio por verificación, cobertura de documentos LATAM, liveness, anti-deepfake, KYB para empresas.

| Provider | Cobertura LATAM | Precio aprox por verificación(*) | Fortalezas |
|---|---|---|---|
| **Sumsub** | Excelente | USD 1.5-3 | All-in-one, AML monitoring, Travel Rule |
| **Veriff** | Buena | USD 1.5-3 | UX de verificación premium |
| **Persona** | Buena | USD 1-2.5 | Flexible, US-first pero LATAM ok |
| **Truora** | Excelente (LATAM-native) | USD 0.8-2 | Foco LATAM, antifraude vehicular |
| **Metamap** (ex Mati) | Excelente (LATAM-native) | USD 0.8-2 | Foco LATAM |
| **Didit** | Buena | USD 0.3-1 | Pricing agresivo, nuevo entrante |
| **Jumio** | Buena | USD 2-4 | Enterprise, caro |
| **Onfido** | Buena | USD 2-4 | Enterprise, gran cobertura |
| **Incode** | Excelente | USD 1.5-3 | Liveness fuerte |

**Recomendación**: Sumsub si querés all-in-one (KYC + AML + Travel Rule + KYB). Metamap o Truora si querés optimizar precio y foco LATAM. Para empresas (KYB): Sumsub o Persona.

### 2.5 Blockchain infrastructure

#### Redes a soportar

Priorización en orden de impacto LATAM:

1. **Ethereum L1**: USDC y USDT nativos, fees altos (USD 3-15 por tx). Solo para volúmenes grandes.
2. **Polygon PoS**: USDC y USDT. Fees ~USD 0.01. **Critical para LATAM**.
3. **Arbitrum**: USDC nativo. Fees ~USD 0.05. Growth importante.
4. **Base**: USDC nativo (Coinbase). Fees ~USD 0.05. Crecimiento explosivo 2024-2025.
5. **Optimism**: USDC. Similar a Arbitrum.
6. **Solana**: USDC + USDT. Fees ~USD 0.001. Importante para LATAM retail.
7. **Tron**: USDT TRC-20 — **enorme en LATAM**, especialmente Argentina y Venezuela. Imprescindible para off-ramp retail.
8. **BNB Chain**: USDT + USDC. Importante por Binance retail LATAM.

**Stack mínimo viable**: USDC en Polygon + Base + Ethereum + USDT en Tron + USDC en Solana. Con esto cubrís el 90% de los casos de uso.

#### RPC providers

| Provider | Cobertura de chains | Pricing |
|---|---|---|
| **Alchemy** | EVM completa + Solana | Free tier generoso + tiers desde USD 49/mes |
| **Infura** (Consensys) | EVM + IPFS | Similar a Alchemy |
| **QuickNode** | Múltiple, incluye Solana, Tron | Pricing por requests |
| **Helius** | Solana específicamente | Mejor para Solana |
| **Ankr** | Multi-chain RPC | Pricing competitivo |
| **GetBlock, BlockPi** | Alternativos cheaper | Para optimización de costo |

**Recomendación**: Alchemy + Helius (Solana) + QuickNode (Tron fallback) cubre todo. Tener 2 providers por chain para failover.

#### Indexers / data layer

| Provider | Uso |
|---|---|
| **The Graph** | Subgraphs custom para tu protocolo, GraphQL |
| **Goldsky** | Indexing managed, más simple |
| **Covalent** | Multi-chain API unificada |
| **Moralis** | Multi-chain, foco Web3 dev |
| **Dune** | Analytics queries (no real-time) |

Para wallet: no necesitás un graph propio, te alcanza con APIs de Alchemy/Covalent para listar balances y txs.

#### AML on-chain / blockchain analytics

| Provider | Precio aprox(*) | Cobertura |
|---|---|---|
| **Chainalysis KYT** | USD 30-100K/año | El estándar bancario, cobertura total |
| **TRM Labs** | USD 25-80K/año | Competitivo, más ágil |
| **Elliptic** | USD 40-120K/año | Fuerte en investigations |
| **Crystal Intelligence** | USD 20-60K/año | Más barato |
| **Solidus Labs** | USD 30-90K/año | Foco en market abuse |
| **Merkle Science** | USD 20-50K/año | Pricing flexible |

**Obligatorio si custodia cripto**: vas a necesitar al menos uno. Chainalysis o TRM son los más aceptados por reguladores.

### 2.6 Pagos locales LATAM (APIs)

#### Argentina

- **CBU/CVU (BCRA)**: identificador único de cuenta. CVU es el equivalente para PSPs (Mercado Pago, Ualá, Belo). Cualquier banco o PSP puede recibir transferencias por CBU/CVU.
- **Red Coelsa**: backbone interbancario AR.
- **Transferencias 3.0**: rieles de transferencia interoperable con QR (push payments). Operadores: MODO, Mercado Pago, Ualá, Naranja X.
- **APIs para integrar**:
  - **Mercado Pago Developers**: APIs documentadas, pero proceso de onboarding largo para fintech.
  - **Ualá Bis**: pagos de cobros.
  - **Manteca, Lirium**: alternativos para fintech cripto.
  - **DEBIN / Pago en cuenta**: rieles para débito directo.
- **Bancos partner directos**: Banco Industrial, Banco BIND, Banco Comafi son los más abiertos a fintechs cripto. Es la pata fiat más difícil de conseguir en AR (varias fintechs cripto fueron "debanked" 2022-2024).

#### México

- **SPEI (Banxico)**: transferencias interbancarias, casi-tiempo-real, gratis o muy barato.
- **CLABE**: identificador de cuenta.
- **CoDi**: QR-based (no muy adoptado).
- **APIs**:
  - **STP** (Sistema Transaccional Premium): el más usado para fintech, conecta directo a SPEI. Onboarding 2-3 meses.
  - **Belvo**: open finance + initiation.
  - **Arcus**: pagos de servicios.
  - **Bitso Shift**: API B2B de Bitso para corredor US-MX.

#### Brasil

- **PIX (Bacen)**: el más avanzado del mundo. 24/7, gratis para PF.
- **APIs**:
  - **Stark Bank**: API-first, popular en fintechs.
  - **Asaas, Iugu, Pagar.me, Mercado Pago BR**: payment processors.
  - **Transfero**: cripto-fiat enfocado.
  - **Open Finance Brasil**: estándar abierto para account info y payment initiation.

#### Colombia

- **PSE**: red de pagos online.
- **Bre-B**: el nuevo PIX colombiano (lanzado 2024-2025).
- **Nequi (Bancolombia), Daviplata (Davivienda)**: wallets dominantes retail.
- **APIs**: Movii, Daviplata API, Bancolombia (limitado), Belvo.

#### Chile

- **Webpay (Transbank)**: dominante en e-commerce.
- **Khipu, Fintoc**: alternativos modernos, A2A payments.
- **Cuenta RUT (BancoEstado)**: cuenta universal.

#### Perú

- **PLIN, Yape**: wallets bancarias (BCP, Interbank, BBVA, Scotiabank).
- **CCI**: código interbancario.
- **APIs**: Culqi, MercadoPago Perú, Niubiz.

#### Uruguay

- **Redes**: Banred, Plus, Pos.
- **APIs**: Prex, Itaú Link, dLocal local.

### 2.7 Frontend stack

#### Mobile (~80-90% del uso)

| Stack | Pros | Contras | Usos en el sector |
|---|---|---|---|
| **React Native + Expo** | Compartís código con web, ecosistema enorme, OTA updates con Expo EAS | Performance subóptimo en animaciones complejas, integraciones nativas requieren dev time | Belo, Lemon (partial), muchos fintechs LATAM |
| **Flutter** | UI consistente, performance, single codebase | Comunidad menor, ecosistema cripto más débil | Algunas implementaciones |
| **Nativo Swift / Kotlin** | Best UX, biometría/secure enclave plenos | 2x dev cost, complejidad releases | Bitso (parcialmente), Mercado Pago, escalados |
| **PWA** | Cero stores | Limitado en biometría push, no recomendado para fintech serio | Solo MVPs muy early |

**Recomendación**: **React Native + Expo + EAS Build**. Cubrís iOS+Android+Web con un equipo de 2-4 devs. Cuando crezcas (>500K MAU) considerás split a nativo.

#### Web (admin, marketing, dashboards business)

- **Next.js + Tailwind + shadcn/ui**: estándar de facto.
- **React + Vite**: si no necesitás SSR.
- **Marketing pages**: Webflow o Framer si tenés equipo no-técnico para iterar copy/SEO.

#### Wallet UX patterns

- **Onboarding**: email/phone → KYC documental → liveness check → fondeo inicial.
- **Auth**: passkey (WebAuthn) > biometría local > 2FA TOTP > SMS (último recurso, vulnerable a SIM swap).
- **PIN local** para confirmar operaciones sensibles, además del biometric.
- **Secure enclave / Keychain** para storage de tokens/credentials. Nunca en AsyncStorage plano.
- **Confirmaciones explícitas** de tx con resumen: monto, destino, fees, tipo de cambio, costo total. Standard post-MiCA Europe pero importante igual.
- **Deep linking** para flujos como recibir USD (mostrar cuenta virtual, copiar routing+account).

### 2.8 Seguridad

#### Key management

- **AWS KMS / Google Cloud KMS**: para secretos generales (API keys, DB passwords). Estándar.
- **AWS CloudHSM / GCP Cloud HSM**: HSM dedicado para llaves críticas. ~USD 1.5K/mes mínimo.
- **HashiCorp Vault**: secret management más portable, on-prem o cloud.
- **Para cripto operativa**: ver §2.2 (Fireblocks, BitGo, Cobo).

#### Autenticación

- **Passkeys (WebAuthn/FIDO2)**: el futuro, soportado en iOS 16+, Android 13+. Adoptalo desde día 1.
- **Biometría local**: TouchID/FaceID + Android BiometricPrompt para confirmar operaciones.
- **TOTP** (Google Authenticator, Authy): MFA para web.
- **SMS OTP**: solo como fallback. Vulnerable a SIM swap (caso Lemon 2022 tuvo varios).
- **Anti SIM-swap**: validar device fingerprint, geolocation anomaly, freeze withdrawals 24-48h tras cambio de credenciales.

#### Anti-fraude

| Provider | Modelo |
|---|---|
| **Sift** | ML antifraude end-to-end |
| **Sardine** | Foco cripto/fintech, ml + risk scoring |
| **Alloy** | Identity decisioning platform |
| **Unit21** | Fraud + AML decisioning |
| **Hummingbird** | Workflow para casos AML/fraud |

#### Infraestructura

- **WAF + DDoS**: Cloudflare (default) o AWS Shield Advanced.
- **Rate limiting**: por user_id, IP, endpoint. Redis-backed.
- **Bot detection**: Cloudflare Turnstile, hCaptcha, PerimeterX.
- **Penetration testing**: anual mínimo. Doyensec, NCC Group, HackerOne pentest services. USD 15-40K por engagement.
- **Bug bounty**: HackerOne o Immunefi (Immunefi es Web3-native, rewards más altos).

#### Compliance technical

- **ISO 27001**: ~12-18 meses para certificarse, USD 30-100K (auditoría + consultor + remediación).
- **SOC 2 Type II**: estándar US, USD 30-80K, ~9-12 meses. Drata, Vanta, Secureframe automatizan.
- **PCI DSS**: solo si tocás datos de tarjeta directos. Si usás procesador (Pomelo, etc.), out of scope.

### 2.9 Compliance tech (Travel Rule, sanctions, monitoring)

#### Travel Rule (FATF Recommendation 16)

Obligación: transferencias cripto >USD 1.000 entre VASPs deben llevar información del originador y beneficiario (nombre, ID, address).

| Provider | Cobertura de VASPs |
|---|---|
| **Notabene** | Líder, ~700+ VASPs en red |
| **Sumsub Travel Rule** | Integrado con su KYC |
| **21 Analytics** | Foco IVMS 101 compliance |
| **Sygna** | Asia-fuerte, expandiendo |
| **VerifyVASP** | Otro player |
| **TRP (Travel Rule Protocol)** | Estándar abierto |

**Costo aprox(*)**: USD 1-3K/mes según volumen.

#### Sanctions / PEP screening

| Provider | Fortaleza |
|---|---|
| **ComplyAdvantage** | API-first, mejor para fintechs |
| **Refinitiv World-Check** | Standard bancario, caro |
| **Dow Jones Risk Center** | Enterprise |
| **Sayari** | Network graph approach |
| **Sumsub AML** | Bundled con KYC |

**Costo aprox(*)**: USD 1.5-5/screening + plataforma USD 20-80K/año.

#### Transaction monitoring

- **On-chain**: Chainalysis KYT, TRM Labs (ver §2.5).
- **Off-chain**: rules + ML sobre tu ledger. Build interno usualmente.
- **Vendor**: Unit21, Hummingbird, Sumsub Monitoring.

### 2.10 Observabilidad y operaciones

| Área | Stack típico |
|---|---|
| Logs | Datadog, OpenSearch + Fluent Bit, BetterStack |
| Métricas | Datadog, Prometheus + Grafana |
| Tracing | Datadog APM, Honeycomb, OpenTelemetry → Tempo |
| Errors | Sentry (estándar absoluto) |
| Uptime | BetterStack, Pingdom, Checkly (synthetic tests) |
| Incident management | PagerDuty (default), Incident.io, FireHydrant |
| On-call rotation | PagerDuty + Slack |
| Status page | Statuspage.io, Better Stack Uptime |
| Feature flags | LaunchDarkly, GrowthBook (open source), Statsig |
| Analytics product | Mixpanel, Amplitude, PostHog (open source) |

**Mínimo para arrancar**: Datadog (logs + metrics + APM, todo-en-uno) + Sentry + PagerDuty + LaunchDarkly. Si presupuesto justo: Grafana stack DIY + Sentry + GrowthBook.

### 2.11 Costos de infraestructura mensual (orden de magnitud)

| Componente | 10K usuarios | 100K usuarios | 1M usuarios |
|---|---|---|---|
| Cloud compute (AWS/GCP) | USD 2-5K | USD 15-40K | USD 80-200K |
| Bases de datos (RDS/Cloud SQL) | USD 1-3K | USD 8-25K | USD 40-100K |
| Custodia cripto (Fireblocks) | USD 4-8K | USD 8-20K | USD 25-60K |
| Banking partner US (Bridge/Column) | USD 5-10K | USD 15-40K | USD 50-150K |
| KYC (Sumsub) — solo nuevos | USD 1-3K | USD 5-15K | USD 30-80K |
| Blockchain analytics (Chainalysis) | USD 2-8K | USD 4-10K | USD 8-20K |
| Travel Rule | USD 1-2K | USD 2-4K | USD 5-10K |
| RPC providers (Alchemy + etc.) | USD 0.3-1K | USD 2-5K | USD 10-30K |
| Observabilidad (Datadog) | USD 1-3K | USD 5-15K | USD 25-80K |
| Comms (Twilio, SendGrid) | USD 0.3-1K | USD 2-8K | USD 10-50K |
| Misc SaaS (Sentry, GrowthBook, etc.) | USD 0.5-1.5K | USD 2-5K | USD 8-20K |
| **TOTAL infra/mes(*)** | **USD 18-46K** | **USD 68-187K** | **USD 291-800K** |

Estos números **excluyen** salarios, marketing, legal, compliance staff. Solo infraestructura técnica + partners variables.

### 2.12 Tiempos realistas de desarrollo

Equipo de **5-10 ingenieros** (2 backend, 2 frontend, 1 mobile, 1 SRE, 1 product, 1 design, 1 QA, +/-):

- **MVP funcional ultra-básico** (signup, KYC, recibir USDC, retirar a CBU vía partner): **3-5 meses**
- **MVP comercializable** (multi-país on-ramp, tarjeta, soporte, AML básico): **8-12 meses**
- **Producto maduro** (custodia propia, multi-chain, multi-país, B2B, premium): **18-24 meses**

Si vas con equipo más chico (2-3 devs full-stack), duplicá los plazos.

### 2.13 Recomendación de stack para arrancar

**Stack opinionado para un MVP serio en LATAM, año 2026**:

```
Frontend mobile:       React Native + Expo + EAS
Frontend web:          Next.js 15 + Tailwind + shadcn
Backend:               Go o Node/TypeScript (NestJS o Fastify)
DB principal:          PostgreSQL (Neon, Supabase, o RDS) + TigerBeetle para ledger
Cola/eventos:          NATS o AWS SQS+SNS
Cache:                 Redis (Upstash o ElastiCache)
Auth:                  Clerk (más rápido) o Supabase Auth o WorkOS para enterprise
KYC:                   Sumsub
Custodia cripto:       Fireblocks (operativa) + Privy (user wallets)
On/off ramp US:        Bridge.xyz (post-Stripe) o Brale (alternativa)
USDC mint/burn:        Circle Mint (cuando volumen lo justifique)
On/off ramp LATAM:     Manteca (AR), Stark Bank (BR), STP (MX), Koywe (multi-LATAM)
Tarjetas:              Pomelo
Blockchain RPC:        Alchemy + Helius (Solana) + QuickNode (Tron)
AML on-chain:          TRM Labs o Chainalysis
Travel Rule:           Notabene
Sanctions/PEP:         ComplyAdvantage
Infra:                 AWS o GCP + Terraform + Kubernetes
Observabilidad:        Datadog + Sentry + PagerDuty
Feature flags:         GrowthBook o LaunchDarkly
Analytics:             PostHog o Mixpanel
Holding corporativo:   Delaware C-Corp + entidad local en país de operación
Banking US partner:    Mercury (early) + Column o Bridge para cuentas virtuales
```

Esto es **estado del arte 2026** para una fintech cripto LATAM que arranca con USD 1-2M de capital.

---

## 3. Regulación y compliance LATAM

### 3.1 Radiografía del modelo Takenos

Antes de meternos por país, hay que entender qué "verticales regulatorias" toca el modelo. Cada una activa un set distinto de licencias:

| Vertical | Actividad | Regulador típico |
|---|---|---|
| Onramp/Offramp cripto | Comprar/vender USDC/USDT contra fiat | Regulador de valores o BC (PSAV/VASP) |
| Custodia cripto | Guardar activos virtuales de terceros | PSAV/VASP + seguro/proof of reserves |
| Cuenta de pago / e-money | Saldo fiat de clientes | Banco Central / regulador fintech |
| Transferencias internacionales | Recibir USD del exterior | Money Transmitter (US) + cambiario local |
| Cambio de divisas | USD → ARS, MXN, BRL, etc. | Banco Central / cambiario |
| AML/CFT | Reportes de operaciones | UIF / FIU local |

Takenos toca **las seis**. Por eso es uno de los modelos más regulados que existen.

### 3.2 Argentina

#### Marco general

Argentina pegó un giro regulatorio fuerte entre 2024 y 2025:

- **Ley 27.739 (marzo 2024)** — modificó la Ley 25.246 de Encubrimiento y Lavado de Activos. Adaptó Argentina a recomendaciones GAFI sobre VASPs. Definió "Proveedor de Servicios de Activos Virtuales" (PSAV) e impuso obligación de registro ante CNV.
- **Decreto reglamentario 469/2024** — designó a la CNV como autoridad de registro.
- **Resolución General CNV 994/2024** — creó el Registro de PSAV: definió categorías, requisitos de inscripción.
- **Resolución General CNV 1058/2024** — endureció requisitos: gobierno corporativo, ciberseguridad, custodia, segregación patrimonial, capital mínimo.

#### Categorías de PSAV

La norma reconoce cinco actividades alcanzadas:

1. Intercambio entre activos virtuales y moneda fiat
2. Intercambio entre dos o más activos virtuales
3. Transferencia de activos virtuales
4. Custodia y/o administración de activos virtuales
5. Participación y/o provisión de servicios financieros relacionados con la oferta o venta de un activo virtual

Takenos cae mínimo en 1, 3 y 4.

#### Requisitos de inscripción

- **Personas jurídicas argentinas:** SA, SRL o SAS con domicilio real.
- **Personas jurídicas extranjeras:** registración como sucursal o sociedad vehículo local.
- **Capital mínimo y patrimonio neto:** umbrales que iban de **AR$ 75-150M** para servicios de menor riesgo a varios cientos de millones para custodia. Se ajustan por UVA/CER(*).
- **Gobierno corporativo:** directorio mínimo, oficial de cumplimiento, oficial de ciberseguridad, oficial de protección al consumidor financiero, auditoría externa.
- **Política AML/CFT:** manual interno, matriz de riesgo, DDR para PEPs, reportes a UIF.
- **Custodia:** segregación patrimonial; cold storage para mayor parte de activos.
- **Ciberseguridad:** estándar similar a Comunicación A 7724 del BCRA.
- **Tasa de fiscalización:** 0.03-0.15% mensual aproximado.
- **Tiempo:** 90-180 días corridos legal; **6-12 meses en práctica**.

#### BCRA — Proveedor de Servicios de Pago

Si ofrecés "cuenta" en pesos donde el cliente tenga saldo, caés en **PSP-CPSI** regido por **Comunicación A 6885** y sucesivas:

- Encaje del **100% de los fondos** de clientes en cuentas bancarias a la vista (no pueden invertirse).
- Reportes mensuales al BCRA, auditoría externa, oficial responsable.
- Inscripción en el Registro de PSP-CPSI.

Si solo procesás sin tener saldo (pass-through), caés en **PSP-PSI**, más liviano.

#### CEPO y régimen cambiario

**El punto más sensible**. Argentina mantiene control de cambios (con flexibilizaciones 2024-2025 bajo Milei, pero no liberación total):

- **Comunicación A 7030 y siguientes:** quien percibe USD del exterior por servicios prestados (freelancer) está obligado a liquidar las divisas en el MULC al tipo de cambio oficial dentro de 5 días hábiles.
- **"Dólar exportador servicios":** régimen especial con tope (USD 12.000 anuales) — se modificó varias veces.
- **El "atajo cripto":** muchos usuarios usan Takenos justamente porque les permite no pasar por MULC. **Zona gris**: técnicamente, si la persona es residente fiscal argentino, debería declarar y liquidar. **Riesgo regulatorio alto para el operador si BCRA considera que está facilitando elusión.**

Solución estructural que usan Takenos, Lemon Earnings, Belo: **el cliente recibe directamente cripto, no fiat**, y la conversión a ARS queda como una operación cripto→fiat local (con MEP implícito vía stablecoins). Esa arquitectura es crucial.

#### UIF Argentina

Obligado por Ley 25.246 + 27.739. Resolución UIF 49/2024 actualizó régimen para PSAVs:

- Registro como Sujeto Obligado ante UIF
- Manual PLA/FT
- Oficial de Cumplimiento titular + suplente
- Reporte Sistemático Mensual (RSM)
- Reporte de Operaciones Sospechosas (ROS)
- DDR (Debida Diligencia Reforzada) para PEPs
- Conservación de información por 10 años

#### Tributación cripto

- **Ganancias:** alícuota del 15% sobre la diferencia para PF.
- **Bienes Personales:** las tenencias al 31/12 están alcanzadas. AFIP las considera bienes situados en el país si el custodio es PSAV argentino. Con régimen REIBP y baja alícuotas 2024-2027, el costo bajó.
- **IVA:** la prestación del servicio de exchange está alcanzada al 21%; debate sobre cripto-cripto.
- **Ingresos Brutos provincial:** CABA y PBA 3-5%.
- **Régimen de Información AFIP:** RG 4614 obliga reportar operaciones de usuarios.

#### Costos Argentina(*)

- Constitución SAS + alta AFIP/IIBB: USD 2-5K
- Honorarios estudio jurídico armado expediente PSAV: USD 20-60K
- Capital mínimo CNV: USD 100-500K (según categoría)
- Oficial de Cumplimiento full-time: USD 30-60K/año
- Auditoría externa anual: USD 15-40K
- Ciberseguridad (pentest + ISO 27001 light): USD 20-50K/año
- Tasa CNV: 0.03-0.15% mensual
- **Total arranque realista: USD 200-600K antes del primer cliente.**

### 3.3 México

#### Ley Fintech 2018

Crea dos figuras:

- **IFPE — Institución de Fondos de Pago Electrónico:** lo más parecido a Takenos. Permite emitir e-money, abrir cuentas, transferir, recibir del exterior.
- **IFC — Institución de Financiamiento Colectivo:** crowdfunding.

Autoridad: **CNBV** + **Banxico** + **SHCP** + **CONDUSEF**.

#### Requisitos IFPE

- Sociedad Anónima mexicana
- **Capital mínimo:** UDIs por valor aproximado de **MXN 7-13M (USD 400-750K)** según operaciones autorizadas.
- Plan de negocio 3 años, manuales operativos completos.
- Acreditación origen lícito de fondos del capital.
- Directorio con experiencia técnica y honorabilidad.
- Infraestructura tecnológica auditada.
- Oficial de cumplimiento certificado.
- **Plazo legal: 180 días hábiles. En práctica: 18-36 meses.**

#### Activos virtuales

La Ley Fintech **NO autorizó cripto al público minorista**. Banxico vía **Circular 4/2019** restringió fuertemente: las IFPE pueden operar activos virtuales **solo para operaciones internas** (clearing) y no pueden ofrecer custodia o trading retail directamente. Para hacerlo necesitan autorización especial de Banxico, que **prácticamente no se ha otorgado**.

**Cómo lo resuelven Bitso, Belo, Buenbit en MX:**
- IFPE para la pata fiat (MXN).
- Conversión a cripto via entidad relacionada off-shore (Bitso International, Gibraltar; Bitso US para corredor con US).
- Custodia cripto en off-shore.

#### Costos México(*)

- Capital mínimo IFPE: USD 400-750K
- Legal + estructuración: USD 150-400K
- Infraestructura tecnológica auditable: USD 100K+
- 18-36 meses sin facturar
- **Total realista: USD 1-2M para licencia propia IFPE.**

**Alternativa**: partner-as-a-service vía Cuna, Albo, Klar o un IFPE existente. Es el camino para entrar a MX en <6 meses.

### 3.4 Brasil

#### Lei 14.478/2022 — Marco Legal das Criptomoedas

Vigente desde junio 2023. **BACEN** regulador VASPs; **CVM** si el cripto califica como valor mobiliario.

BACEN emitió consultas públicas (CP 109, 110, 111) en 2024 y publicó normas finales en 2025:

- Registro como **Prestador de Serviços de Ativos Virtuais (PSAV brasileño)** ante BACEN.
- Categorías: intermediário, custodiante, corretora.
- Capital mínimo preliminar: **BRL 1-35M (USD 200K-7M)** según categoría.
- Gobierno corporativo, AML/CFT (Lei 9.613 + COAF).
- Segregação patrimonial obligatoria.
- Cyber resilience (Resolução BCB 85).

Plazo de adecuación: 6-12 meses post-vigencia (cronograma 2025-2026).

#### Sistema de pagos / PIX

Para operar fiat (recibir BRL, hacer PIX):

- **Instituição de Pagamento (IP)** autorizada por BACEN.
- Capital mínimo IP: BRL 3M (~USD 600K) para emissora de moeda eletrônica.
- Acceso al PIX: directo (autorización BACEN) o indirecto (vía banco parceiro).
- Cambio (Lei 14.286/2021 — Marco Cambial — flexibilizó).

#### Recepción de USD del exterior

Lei 14.286/2021 + regulamentação modernizou. IPs autorizadas pueden ofrecer eFX (cambio digital) para recibir USD del exterior directamente en cuenta BRL. **Wise Brasil y Nomad operan bajo este marco.**

#### Receita Federal — IN 1888

Reporte mensual obligatorio para exchanges domésticos y para PF que operen en exchanges del exterior >BRL 30K/mes.

#### Costos Brasil(*)

- Setup empresa BR + CNPJ: USD 5-15K
- Legal full stack VASP + IP: USD 150-400K
- Capital mínimo: USD 600K-1M agregado IP + VASP
- 12-24 meses
- **Total: USD 800K-1.5M.**

**Alternativa BaaS**: Dock, Swap, BTG Pactual+, Mercado Pago.

### 3.5 Colombia

#### Estado actual

**No hay ley cripto aún**. Proyectos en trámite desde 2021 (PL 028/2022 y sucesivos) — sin sanción al cierre 2025/2026.

Lo que existe:

- **Concepto Superfinanciera 2017:** prohíbe a entidades vigiladas operar cripto.
- **Sandbox "laArenera":** pilotos cashin/cashout cripto con bancos (Bancolombia + Buda, Davivienda + Binance) en 2021-2023.
- **DIAN:** trata cripto como bien intangible.
- **UIAF:** Resolución 314/2021 — exchanges como sujetos obligados AML.

#### SEDPE

**Sociedad Especializada en Depósitos y Pagos Electrónicos** (Ley 1735/2014):

- Capital mínimo: COP ~6.700M (~USD 1.5M).
- Autorizada por Superfinanciera.
- Permite cuentas, transferencias, pagos. **NO permite intermediación cripto explícita.**
- Ejemplos: Movii, Coink, Daviplata.

#### Cómo operan Binance, Bitso, Lemon en Colombia

Sin marco específico:
- Entidad local SAS (no vigilada).
- Cumplimiento UIAF como reportante.
- On/off ramp via PSP tercero (Movii, PSE, Bancolombia).
- Custodia cripto offshore.

#### Costos Colombia(*)

- SAS Colombia: USD 3K
- Reporte UIAF + estudio jurídico: USD 30-80K/año
- **Sin licencia formal, entrada barata pero riesgo regulatorio alto.**

### 3.6 Chile

#### Ley Fintec 21.521 (2023)

Reglamentada por CMF en 2024. Crea figuras nuevas:

- Intermediación de cripto-activos (registro CMF)
- Custodia de instrumentos financieros (incluye cripto)
- PISP (servicios iniciación pagos)

Capital mínimo según servicio y volumen: UF 5.000-20.000 (USD 200-800K).

#### BCCh y cambio

Chile tiene mercado cambiario relativamente abierto. Operaciones reportables desde USD 10K.

#### UAF Chile

Ley 19.913. VASPs como sujetos obligados desde 2020 (modificación post-GAFI).

#### Costos Chile(*)

- Setup SpA: USD 2-5K
- Legal: USD 50-150K
- Capital regulatorio: USD 200-800K
- 9-18 meses
- **Total: USD 300K-1M.**

**Chile es uno de los marcos más prolijos de LATAM.** Buen candidato para HQ regulatorio.

### 3.7 Perú

Perú aprobó en 2024 la **Ley 31.886 / variaciones — Marco para VASPs** (estado promulgación verificar 2026).

Mientras tanto:
- **SBS:** no autoriza cripto bajo licencia bancaria. Alertas.
- **UIF-Perú:** VASPs sujetos obligados desde 2022 post-GAFILAT.
- **SUNAT:** cripto como bien intangible, ganancias gravadas.
- **BCRP:** mercado cambiario libre.

#### Costos Perú(*)

- Setup SAC: USD 2-4K
- Legal + AML inicial: USD 20-50K
- Sin capital regulatorio formal todavía.

**Entrada barata, riesgo regulatorio futuro.**

### 3.8 Uruguay

#### Ley 20.345 (2024) — Mercado de Valores y Activos Virtuales

Uruguay sancionó en 2024 una ley que introduce **PSAVs** bajo supervisión del **BCU** vía **SSF**:

- Cuatro tipos: exchange fiat-cripto, exchange cripto-cripto, transferencias/custodia, plataformas de oferta.
- Requisitos: empresa local, capital mínimo (en UI), gobierno corporativo, AML/CFT bajo SENACLAFT.
- Reglamentación BCU en circulares 2024-2025.

#### Atractivos Uruguay

- Marco claro y predecible.
- Régimen tributario favorable (ganancias de fuente uruguaya; zona franca disponible).
- Estabilidad institucional alta.
- Acceso bancario abierto.
- Idioma español, talento técnico decente.

**Para emprendedor LATAM-first sin presencia US, Uruguay es candidato fuerte como holding operativo.** dLocal (unicornio) escaló desde ahí. Bitfinex y Bitstamp tienen presencia.

#### Costos Uruguay(*)

- Setup SA: USD 3-8K
- Legal: USD 40-100K
- Capital: USD 100-300K según categoría
- 6-12 meses

### 3.9 Estados Unidos (crítico)

Si la fintech recibe USD del exterior y mueve dinero, **toca jurisdicción US**, salvo que use partner con licencias.

#### Federal

- **FinCEN MSB registration:** trámite simple, gratuito. Obliga a AML program, SAR, CTR, recordkeeping.
- **OFAC sanctions screening:** obligatorio. SDN list, sectoral sanctions, geo-blocking.
- **BSA + Patriot Act:** KYC, BOI, reportes.

#### Estatal — Money Transmitter License (MTL)

Cada estado (50 + DC + PR) tiene su propio MTL:

- 49 estados exigen (Montana no).
- Bond: USD 25K-7M según estado.
- Capital mínimo: USD 25K-500K según estado.
- Legal fees: USD 5-25K por estado.
- Tiempo: 12-24 meses cobertura nacional.
- **Costo total cobertura 50 estados: USD 3-7M.**

#### NYDFS BitLicense

- Capital mínimo: USD 500K
- Application fee: USD 5K
- Tiempo: 18-36 meses
- Muchos exchanges bloquean NY antes que tramitarla.

#### Cómo lo resuelven Takenos/Lemon/Belo

**Casi ningún fintech LATAM tiene MTL propia en US**. Opciones:

**A — Partner BaaS:**
- **Bridge.xyz (Stripe, post-2024-2025):** stablecoin orchestration, recibe USD vía partner bank (Lead Bank, Cross River), convierte USDC, entrega LATAM. Bridge usa MTL del partner.
- **Brale, Conduit, Felix Pago:** competidores.
- **Mercury, Cross River, Evolve, Lead Bank, Column:** cuentas operativas pero no MTL completo.

**B — Adquisición de licencia:** caro. Mercado Pago compró MTL. Bitso compró Quedex.

**C — Estructura híbrida cripto-native:**
- Cliente envía USD al partner (MSB-MTL).
- Partner convierte a USDC y manda a wallet del usuario.
- Fintech LATAM solo opera off-ramp en moneda local.
- En US no hay money transmission propia: solo proveedor tecnológico.

**Es la arquitectura de Takenos y la mayoría.** Funciona si el partner US asume y declara la transmisión.

### 3.10 Travel Rule (FATF Recommendation 16)

Estándar internacional. Transferencias cripto >USD/EUR 1.000 entre VASPs deben transmitir información origen/destino.

Implementaciones:
- US: vigente (FinCEN, NYDFS).
- Argentina: RG CNV 1058.
- Brasil: regulación 2025.
- México: vía CNBV en IFPE.
- Chile: Ley Fintec.
- Uruguay: Ley 20.345.

Proveedores: Notabene, Sumsub Travel Rule, TRP, Sygna, VerifyVASP.

### 3.11 Estructura corporativa típica

```
                    HOLDING CAYMAN / BVI / DELAWARE
                    (recibe inversión VC, holdea IP)
                              |
        +---------------------+---------------------+
        |                     |                     |
   US OpCo (Delaware)     LATAM HoldCo         CRYPTO OpCo
   - MSB FinCEN           (Uruguay/Chile)      (BVI / Cayman /
   - Partner bancario     - Hub regional       Singapur / Gibraltar)
   - Procesa USD                                - Custodia cripto
                                                - Liquidez
                              |
              +---------------+---------------+
              |               |               |
         AR SAS          MX IFPE          BR Ltda
         CNV PSAV        CNBV             BACEN PSAV
         BCRA PSP        Banxico          + IP
         UIF             UIF SHCP         + COAF
```

| Entidad | Setup(*) | Mantenimiento anual(*) |
|---|---|---|
| Cayman Exempted Co | USD 10-20K | USD 5-15K |
| BVI BC | USD 3-8K | USD 2-5K |
| Delaware C-Corp | USD 1-3K | USD 0.5-2K |
| Uruguay SA | USD 3-8K | USD 3-8K |
| Singapur Pte Ltd | USD 5-15K | USD 5-10K |

### 3.12 Cuadro comparativo final por país

Escala 1 (muy difícil) a 5 (muy fácil) ponderando: claridad regulatoria, costo licencia, tiempo a mercado, riesgo cambio normativo, atractivo mercado.

| País | Claridad | Costo | Tiempo | Riesgo cambio | Atractivo | TOTAL /25 |
|---|---|---|---|---|---|---|
| **Uruguay** | 5 | 4 | 4 | 5 | 2 | **20** |
| **Chile** | 5 | 3 | 3 | 5 | 3 | **19** |
| **Brasil** | 4 | 2 | 2 | 4 | 5 | **17** |
| **Perú** | 2 | 5 | 4 | 2 | 3 | **16** |
| **Colombia** | 1 | 5 | 4 | 2 | 4 | **16** |
| **México** | 4 | 1 | 1 | 4 | 5 | **15** |
| **Argentina** | 3 | 3 | 3 | 1 | 4 | **14** |

#### Lectura estratégica

- **HQ regulatorio con marco claro:** Uruguay o Chile.
- **Volumen pagando caro:** Brasil (via partner) y México (via IFPE partner).
- **Tu mercado natural Argentina:** registro PSAV CNV sí o sí + resolver problema cambiario (mantener todo en stablecoins, off-ramp via PSAV partner).
- **Probar rápido y barato:** Perú o Colombia, asumiendo riesgo de reestructurar cuando salgan leyes.

### 3.13 Compliance operacional transversal

#### Programa AML/CFT completo (cualquier país serio te lo exigirá)

1. **Risk Assessment** documentado actualizado anual.
2. **KYC por niveles**: básico → reforzado → pleno.
3. **Sanctions screening tiempo real**: OFAC SDN, EU, UK, ONU, listas locales.
4. **PEP screening**: World-Check, ComplyAdvantage, Dow Jones.
5. **Transaction monitoring**: reglas + ML.
6. **Blockchain analytics**: Chainalysis KYT, TRM, Elliptic.
7. **SAR/ROS workflow**: generación, revisión MLRO, envío a UIF.
8. **Training anual** del staff.
9. **Independent audit AML** cada 12-18 meses.

#### Roles obligatorios

- MLRO / Oficial de Cumplimiento titular (persona registrada).
- Oficial de Cumplimiento suplente.
- CISO / Oficial de Ciberseguridad (AR, MX, BR, CL).
- Oficial Protección Consumidor Financiero (AR, MX).
- Director independiente (MX sí).
- Auditor externo independiente.

#### Proof of Reserves

Casi todas las regulaciones nuevas exigen para custodia cripto:
- Segregación 1:1 fondos de clientes vs propios.
- Cold storage >80-95% de activos.
- Atestación periódica por auditor independiente (Mazars, Armanino, BDO, Grant Thornton).
- Merkle tree público para verificación de saldos por usuario.
- Costo realista(*): USD 30-100K/año.

---

## 4. Modelo de negocio y unit economics

### 4.1 Fuentes de ingreso (siete capas)

#### 4.1.1 Fee por recibir USD del exterior

Rieles típicos:

| Riel | Takenos(*) | Wise | Payoneer | Deel Wallet |
|---|---|---|---|---|
| ACH USA entrante | 0% a 1% | 0% | ~1% + spread | 0% |
| Wire SWIFT entrante | $5-15 o 0.5-1% | $6-12 fijos | $15-25 | $20 retiro |
| PayPal → wallet | 1.5-3% | n/a | n/a | n/a |
| Wise → wallet | 0.5-1% | spread propio | n/a | n/a |
| Deel/Upwork → wallet | 0.5-1% | 1% Wise | n/a | nativo |

**El fee headline es bajo o cero porque el negocio está en la salida** (conversión a moneda local). Estándar del sector (Wise, Payoneer, Revolut hacen lo mismo).

#### 4.1.2 Spread cambiario (la fuente #1)

Aquí está el dinero. **Dos conversiones sucesivas** en operación típica:

**Conversión A: USD → USDC/USDT**
- Costo real del provider (Circle, Bridge, Coinbase Prime): 0.05-0.15%
- Spread al usuario: 0% (USDC) o 0.3-0.8% (USDT)

**Conversión B: USDC/USDT → moneda local**

| País | Par | Spread mercado retail | Spread Takenos(*) |
|---|---|---|---|
| Argentina | USDC/ARS | 1-3% sobre MEP, hasta 4-5% en stress | 2-4% vs MEP |
| Brasil | USDC/BRL | 0.8-2% sobre PTAX | 1-2% |
| México | USDC/MXN | 0.8-1.5% sobre interbancario | 1-2% |
| Colombia | USDC/COP | 1.5-3% | 2-3% |
| Chile | USDC/CLP | 1-2% | 1.5-2.5% |
| Uruguay | USDC/UYU | 1.5-2.5% | 2% |

En **Argentina específicamente**, hay sub-spread adicional entre "dólar cripto" y "dólar oficial/MEP". El usuario compara contra blue/MEP, el operador captura margen sin que se perciba caro.

#### 4.1.3 Fee de retiro local

- Argentina (CBU/CVU): gratis hasta tope, luego fijo o 0.5%.
- Brasil (PIX): gratis (normativa BCB).
- México (SPEI): gratis o MXN 5-10 fijos.
- Colombia (PSE/Transfiya): gratis o ~COP 2-5K.

**No es fuente material**; costo operativo absorbido por fricción.

#### 4.1.4 Fee de envío on-chain

- USDC/USDT Polygon/Arbitrum/Base/Optimism: free o $0.5 fijos.
- USDC/USDT Ethereum L1: $5-15 según gas.
- USDT TRC-20: $1-2.
- Margen operador: 30-60% sobre costo real de gas.

#### 4.1.5 Membresía Premium / Plus

Pricing típico: **USD 5-15/mes**. Incluye:
- Mejor tipo de cambio (spread reducido 0.5-1%)
- Tarjeta debit
- Soporte priority
- Transferencias ilimitadas
- Cashback / rewards

**Adopción esperada en base activa: 15-30%.** Pagaba el ahorro de spread la suscripción.

#### 4.1.6 Tarjeta prepaga (segundo motor de ARPU)

Stack: Pomelo o Galileo + Visa/Mastercard.

Revenue:
- **Interchange**: 1.2-1.8% LATAM, 1.5-2% US (consumer debit).
- Cashback devuelto: 0.5-1.5%.
- Spread FX en compras moneda extranjera: 1-3%.
- Fee emisión física: USD 5-15.
- ATM withdrawal fees post N retiros gratis.

Tarjeta activa de freelancer gastando USD 1.500/mes: **USD 18-25/mes interchange** menos USD 5-10 cashback = neto **USD 10-18/mes**.

#### 4.1.7 Float e intereses

Si USDC quedan en wallet operador (custodial):
- Circle Reserve yield: ~4-5% APY 2023-2025 (bajando a 3.5-4% si Fed corta).
- Tesoros US via partner banking: similar.
- Lending institucional Aave/Compound: 3-6% (con riesgo SC).

**Operador pasa 0-1.5% al usuario; retiene spread como ingreso neto.**

Ejemplo: 50K usuarios activos × USD 500 promedio balance = USD 25M custodiado. A 3% margen neto float = **USD 750K/año "gratis"**.

#### 4.1.8 FX para enviar al exterior (off-ramp salida)

Servicio creciente: freelancer ya tiene USDC y quiere pagar Netflix, AWS, mandar plata a US. Operador cobra:
- 0.5-2% spread conversión inversa
- Fee fijo remesa USD 3-10

### 4.2 Tamaño del mercado

#### 4.2.1 Freelancers LATAM cobrando del exterior (estimaciones)

- **Argentina**: 400-700K tech facturando exterior. CESSI/Argencon estiman 130-150K formalizados.
- **Brasil**: 800K-1.2M.
- **México**: 500-700K.
- **Colombia**: 300-450K.
- **Resto LATAM**: 400-600K.

**Total TAM: ~3-4M personas físicas + micros.**

Ticket promedio USD 1.5-3K/mes. Volumen anual: **USD 70-120B/año** flujos exterior → LATAM tech freelancers.

Consistente con cifras públicas: Deel procesa varios billions/año a LATAM; Payoneer reportó >USD 8B solo Argentina en años recientes.

#### 4.2.2 Crecimiento

- Pre-2020: USD 15-25B/año.
- Boom 2020-2022: +60% YoY.
- 2023-2025: 15-25% YoY normalizado.
- Driver estructural: USD sigue más atractivo que moneda local en casi toda LATAM.

#### 4.2.3 Métricas conocidas de Takenos(*)

- Fundada ~2021-2022.
- Founders ex-Mercado Libre / sector cripto LATAM.
- ~80-150K usuarios y USD 20-50M/mes volumen procesado en late 2024 (estimación, verificar).
- Foco original Argentina; expansión a Uruguay, México, Colombia, Brasil progresiva.

### 4.3 CAC y LTV (benchmarks sector)

| Métrica | Cripto/Wallet LATAM | Neobanks LATAM | Fintech B2B |
|---|---|---|---|
| CAC blended | USD 8-25 | USD 5-15 | USD 200-600 |
| CAC paid-only | USD 30-80 | USD 20-50 | USD 800-2.500 |
| CAC referral | USD 3-10 | USD 2-8 | USD 50-150 |
| Activación (signup → 1ª tx) | 25-40% | 35-50% | 30-50% |
| LTV bruto | USD 80-300 | USD 60-200 | USD 3-15K |
| LTV/CAC sano | 4-8x | 3-6x | 4-10x |
| Payback | 6-14 meses | 8-18 meses | 12-24 meses |
| Margen bruto | 50-70% | 35-55% | 60-80% |
| Churn mensual | 4-8% | 3-6% | 1-3% |

**Para Takenos**: CAC referral es el más rentable (freelancers se recomiendan en Slack/Discord/Twitter). CAC Google/Meta Ads para "recibir dólares" en Argentina es caro (USD 30-60) por saturación.

### 4.4 Costos operativos

#### Custodia cripto

| Provider | Costo |
|---|---|
| Fireblocks tier inicial | USD 40-60K/año |
| BitGo institucional | 0.15-0.5% AUM + tx fees, mínimo USD 50K |
| Cobo / alternativas | USD 20-80K/año |

#### On/off ramp

- Bridge.xyz/Stripe: 0.1-0.5% per tx + setup.
- Circle Mint: free pero compliance complejo.
- Off-ramp LATAM: 0.3-1% según país.
- **Blended esperado por tx full-cycle: 0.5-1.2% del notional.**

#### KYC/KYB

- KYC individual: USD 0.8-2.5/verif.
- KYB empresa: USD 5-20/verif.
- AML monitoring: USD 25-100K/año.
- **Costo efectivo por usuario activo (con 35% activación): USD 4-5.**

#### Banking partners US

- Setup: USD 25-100K.
- Monthly minimum: USD 5-25K.
- ACH inbound: USD 0.05-0.25.
- Wire inbound: USD 5-15.
- Virtual account: USD 0.5-2/mes.
- **Mínimo realista: USD 80-150K/año.**

#### Compliance, legal, licencias

- Compliance Officer + Analyst LATAM: USD 60-120K/año.
- Legal externo: USD 30-100K/año.
- Licencias:
  - Argentina (PSAV CNV): USD 10-30K/año mantenimiento.
  - Brasil (VASP CVM/BCB): USD 50K+.
  - México (ITF/IFPE): USD 100K+ y largo.
  - Colombia (sandbox): USD 20-50K.

#### Infraestructura cloud

- AWS/GCP: USD 3-15K/mes MVP; USD 30-100K/mes a escala 100K activos.
- Twilio: USD 0.03-0.08/SMS LATAM.
- Datadog/Sentry/Mixpanel: USD 2-10K/mes.

#### Customer support

- Ratio: 1 agente / 3-5K usuarios activos.
- Costo blended LATAM: USD 800-1.5K/mes/agente.
- Tooling (Intercom/Zendesk): USD 2-8K/mes.

#### Marketing

- Referral payouts: USD 5-15 por nuevo activado.
- Performance ads: USD 15-60K/mes growth phase.
- Content (blog, SEO, YouTube): 1-3 personas.
- Influencers/partnerships: USD 5-50K/mes.
- Eventos.

### 4.5 Contribution margin ejemplo

**Usuario**: freelancer argentino que recibe USD 2.000/mes vía ACH, convierte a USDC, pasa USD 1.000 a ARS (mes), deja USD 1.000 USDC.

#### Ingresos operador / mes (USD)

| Concepto | Cálculo | Ingreso |
|---|---|---|
| Fee inbound ACH | 0% | 0 |
| Spread USD→USDC | 0.3% × 2.000 | 6 |
| Spread USDC→ARS | 2.5% × 1.000 | 25 |
| Float USDC $1.000 | 3.5%/12 | 2.9 |
| Retiro CBU | gratis | 0 |
| Tarjeta (gasta $500) | 1.5% interchange neto | 7.5 |
| **TOTAL** | | **~41** |

#### Costos variables / mes (USD)

| Concepto | Costo |
|---|---|
| Banking US (ACH + virtual) | 0.5 |
| Custodia cripto alocada | 0.3 |
| On/off ramp (~0.7% × 1.000) | 7 |
| Procesador tarjeta (sobre 500) | 1.2 |
| Soporte alocado (1/4K users) | 0.3 |
| KYC reverif + AML | 0.3 |
| Infra alocada | 0.2 |
| **TOTAL** | **~10** |

#### Resultado

- **Contribution margin por usuario activo: ~USD 31/mes (~75% margen bruto)**
- **ARPU anual: ~USD 490**
- **Break-even**: ~6.000 usuarios activos cubren estructura mínima.
- **Sólidamente rentable**: 25-40K activos.

**Spread power-user**: usuario USD 5.000-10.000/mes con tarjeta + Plus + float alto puede generar USD 80-150/mes. La diferencia con "recibe-y-retira" justifica empujar upgrade.

### 4.6 Funding y valuación

#### Takenos (estimación, verificar Crunchbase)(*)

- Seed (~2022): USD 2-4M, LatitudVC liderando probablemente, ángeles cripto LATAM.
- Serie A o pre-A (2023-2024): USD 8-15M, posible Kaszek/Monashees.
- **Total raised: ~USD 10-20M estimado**.
- Valuación: ~USD 50-120M post-A.
- YC W21 — verificar.

#### Comparables LATAM(*)

| Empresa | País | Total raised | Valuación pico | Notas |
|---|---|---|---|---|
| **Bitso** | MX | ~USD 300M | ~USD 2.2B (2021) | Líder LATAM, B2B + retail |
| **Buenbit** | AR | ~USD 15M | USD 80-100M | Cortó equipo 2022 |
| **Lemon** | AR | ~USD 60M | USD 200-300M (2022) | Tarjeta + cripto |
| **Belo** | AR | ~USD 10-15M | USD 50-80M | Tarjeta + multi-moneda |
| **Ripio** | AR/BR | ~USD 70M | USD 500M+ | Más antiguo |
| **Mercury (US comp)** | US | ~USD 150M | USD 1.6B (2021) | Banking fintech |
| **Wise** | UK | IPO | ~USD 10B mkt cap | Benchmark global |
| **Deel** | US | ~USD 680M | USD 12B (2024) | Empleo + pagos contractors |

#### Múltiplos sector LATAM 2024-2025(*)

- Early stage pre-PMF: 10-25x revenue forward.
- Post-PMF growth: 6-15x revenue trailing.
- Mature scale-up: 4-8x revenue trailing.
- Post crypto winter 2022: múltiplos cripto se comprimieron 50-60% vs neobanks tradicionales.

### 4.7 Estrategia de growth

1. **Referral cash**: USD 5-15 al referente cuando referido completa 1ª tx >USD 200. ~30-50% nuevos signups en operadores maduros.
2. **Content SEO long-tail**: "cómo cobrar Upwork Argentina", "comparativa Wise vs X". CAC muy bajo. El blog de Takenos siempre fue asset fuerte.
3. **Partnerships plataformas freelance**: integración nativa Workana, Deel, Remote. LTV alto.
4. **Comunidades tech**: Slacks/Discords devs LATAM, Twitter dev.
5. **Influencers cripto/finance LATAM**: ROAS variable, useful para brand.
6. **PR/medios**: Infobae, Iproup, Bloomberg Línea, Contxto.
7. **Eventos**: Devconnect, ETH LATAM, Nerdearla, ABCripto.

**Network effects débiles** vs marketplaces. Moats reales:
- Costo de switch (KYC hecho, tarjeta vinculada Netflix/AWS).
- Brand/trust (clave post-FTX).
- Producto cross-sell (tarjeta, yield, B2B).

### 4.8 Expansión y nuevos productos

Roadmap natural para subir ARPU de USD 30 → USD 80-120/mes:

1. **Tarjeta debit** (mes 6-12 post-PMF): +USD 10-20.
2. **Cuenta global multi-moneda** (EUR, GBP): +USD 3-5.
3. **Yield stablecoins** (4-5% pass-through con margen): +USD 1-3, alta retención.
4. **Pagos a contractors B2B**: ARPU empresa USD 100-500/mes.
5. **Facturación / monotributo automático AR**: USD 5-10/mes SaaS-like.
6. **Préstamos con colateral cripto**: 5-10% spread.
7. **Remesas P2P intra-LATAM**: bajo margen, alto engagement.
8. **Inversiones cripto / DCA Bitcoin**: 0.5-1% fee + spread.

**Modelo evolutivo**: Mercury/Brex para freelancers LATAM — cuenta business, facturación, payroll a contractors, capital.

### 4.9 Riesgos

| Riesgo | Mitigación |
|---|---|
| **Regulatorio AR (cambio CEPO)** | Levantamiento total achicaría spread 50%. Diversificar países. |
| **Regulatorio MX/BR (licencias trabadas)** | Operar via partner mientras se tramita licencia propia. |
| **FX devaluación brusca** | Treasury en USD/USDC, hedgear ARS solo operativo. |
| **Depeg USDC (caso SVB mar 2023)** | Diversificar USDC + USDT + PYUSD + tesoros tokenizados. |
| **Depeg USDT** | Menos probable, existencial. Misma mitigación. |
| **Hack smart contract/bridge** | Usar L1 Ethereum y cadenas establecidas. Evitar bridges nuevos. |
| **SVB/Synapse type events** | Diversificar a 2-3 banking partners US. |
| **Debanking partner cripto** | Redundancia, contratos con SLA, plan B. |
| **Concentración Stripe-Bridge** | Stack alternativo (Brale, Conduit, Circle directo). |
| **Competencia gigantes (Mercado Pago, Nubank Cripto, Binance LATAM)** | Nicho diferenciador, no competir en commodity. |

### 4.10 Capital mínimo para arrancar

#### MVP serio en 1 país (Argentina, 12-18 meses)

Target: 3-5K usuarios activos, USD 5-15M procesado.

| Concepto | USD/año |
|---|---|
| Equipo fundador (2 founders market floor) | 80-120K |
| Tech team (2 devs + 1 product) | 150-220K |
| Compliance + ops (1 + part-time legal) | 60-100K |
| Customer support (1 persona) | 18-30K |
| Banking partner US setup + minimums | 80-120K |
| Custodia cripto (Fireblocks starter) | 40-60K |
| On/off ramp providers | 20-50K |
| KYC / AML tooling | 30-60K |
| Infra cloud, SaaS | 30-60K |
| Legal + licencias Argentina | 30-60K |
| Marketing inicial | 80-200K |
| Buffer 15% | 100-150K |
| **TOTAL año 1** | **~USD 720K-1.23M** |

**Realista: USD 1-1.5M para 12-18 meses runway hasta PMF en 1 país.** Es lo que típicamente levanta un seed pre-PMF.

**Versión scrappy** (solo founder técnico, partner blanca total, sin Fireblocks): USD 250-400K. Techo bajo, riesgo operativo alto.

#### Expansión 3-5 países (Año 2-3)

Target: 20-50K activos, USD 80-200M/año procesado.

| Concepto | USD/año |
|---|---|
| Equipo 25-35 personas | 1.5-2.5M |
| Banking partners por país + US backup | 250-400K |
| Custodia + on/off ramp escalado | 200-400K |
| Compliance staff multi-país | 250-450K |
| Licencias múltiples (BR, MX, CO) | 200-500K |
| Marketing growth (CAC paid agresivo) | 800K-2M |
| Infra escalada | 150-300K |
| Soporte multi-país | 200-400K |
| **TOTAL año 2-3** | **~USD 3.5-7M/año** |

**Capital total para 5 países con tracción seria: USD 8-15M en 2-3 rondas (Seed + Serie A).**

### 4.11 P&L estimado 12 meses (Argentina-only realista)

Asunciones:
- Lanzamiento mes 0.
- Crecimiento: 200 → 7.000 activos en 12 meses.
- ARPU evolutivo: USD 18 (m1-3) → 25 (m4-9) → 32 (m10-12, tarjeta lanza m8).
- Contribution margin 70% sostenido.

| Mes | Usuarios | ARPU | Revenue | Var costs | Contribution | Fixed costs | EBITDA |
|---|---|---|---|---|---|---|---|
| 1 | 200 | 18 | 3.600 | 1.080 | 2.520 | 60.000 | (57.480) |
| 2 | 600 | 18 | 10.800 | 3.240 | 7.560 | 65.000 | (57.440) |
| 3 | 1.200 | 18 | 21.600 | 6.480 | 15.120 | 70.000 | (54.880) |
| 4 | 1.800 | 25 | 45.000 | 13.500 | 31.500 | 75.000 | (43.500) |
| 5 | 2.500 | 25 | 62.500 | 18.750 | 43.750 | 80.000 | (36.250) |
| 6 | 3.200 | 25 | 80.000 | 24.000 | 56.000 | 85.000 | (29.000) |
| 7 | 4.000 | 25 | 100.000 | 30.000 | 70.000 | 90.000 | (20.000) |
| 8 | 4.700 | 28 | 131.600 | 39.480 | 92.120 | 95.000 | (2.880) |
| 9 | 5.300 | 28 | 148.400 | 44.520 | 103.880 | 100.000 | 3.880 |
| 10 | 5.900 | 32 | 188.800 | 56.640 | 132.160 | 105.000 | 27.160 |
| 11 | 6.500 | 32 | 208.000 | 62.400 | 145.600 | 110.000 | 35.600 |
| 12 | 7.000 | 32 | 224.000 | 67.200 | 156.800 | 115.000 | 41.800 |
| **Total Y1** | — | — | **~1.224K** | **367K** | **857K** | **1.050K** | **(193K)** |

- Revenue año 1: USD 1.2M
- Quema neta: ~USD 200K operación + USD 200-300K CAPEX inicial
- Break-even mensual: ~mes 9 con 5K activos
- Burn total año 1: USD 400-500K escenario bueno; USD 800K-1M realista

**Escenario malo** (CAC 3x, churn 12% mensual, spread comprimido): break-even a mes 18-24, necesita otra ronda.

**Escenario bueno** (referral viral, partnership Deel/Workana, expansión temprana MX): break-even mes 6-7, Serie A a 4-6x sobre invertido.

### 4.12 Conclusión modelo de negocio

#### ¿Es viable?

Sí — Lemon, Belo, Buenbit, Takenos, Bitso, Ripio son evidencia. PERO:

1. **Margen real en spread, no en fees.** Si competís con "tarifa transparente cero spread", no hay negocio.
2. **Negocio de escala con costos fijos altos.** Hasta 5-10K activos por país, perdés plata.
3. **El compliance/banking es el moat real.** La parte técnica es resoluble; mantener banking US + custodia + licencias 2+ años es el filtro.
4. **Mercado grande pero competido.** TAM 3-4M freelancers LATAM, 6+ jugadores serios con USD 10-300M raised. Diferenciarse por nicho, no por precio.

---

## 5. Panorama competitivo

### 5.1 Mapa de competidores

#### Competencia directa (cripto + fiat LATAM, freelancer-focused)

| Competidor | País origen | Año fundación | Total raised(*) | Foco principal |
|---|---|---|---|---|
| **Takenos** | AR | ~2021 | ~USD 10-20M(*) | Freelancers AR/MX/CO/BR, recibir USD |
| **Lemon Cash** | AR | 2020 | ~USD 60M | Retail cripto + tarjeta + earnings |
| **Belo** | AR | 2020 | ~USD 10-15M | Multi-moneda + tarjeta + cripto |
| **Buenbit** | AR | 2018 | ~USD 15M | Exchange + tarjeta + tasas |
| **Bitso** | MX | 2014 | ~USD 300M | El gigante; retail + B2B + remesas US-MX |
| **Ripio** | AR | 2013 | ~USD 70M | Exchange veterano + B2B |
| **Fiwind** | AR | 2021 | < USD 5M | Exchange + tarjeta crypto AR |
| **SatoshiTango** | AR | 2014 | < USD 5M | Exchange P2P-cripto AR |
| **Let's Bit** | AR | 2017 | n/a | Exchange retail AR |
| **Prex** | AR/UY | n/a | parte de Itaú | Wallet + tarjeta retail |
| **Ualá Bitcoin** | AR/MX/CO | 2017 (Ualá) | ~USD 540M (Ualá total) | Neobank con cripto bolt-on |
| **Mercado Pago Cripto** | LATAM | parte de MELI | n/a | El elefante; cripto bolt-on |
| **Astropay** | LATAM | 2009 | n/a | Pagos + cripto |
| **Foxbit, Mercado Bitcoin, Bitypreço** | BR | varios | varios | Exchanges BR retail |

#### Competencia indirecta (fiat-only, recibir USD del exterior)

| Competidor | Foco |
|---|---|
| **Wise** (Business) | USD account global, FX transparente |
| **Payoneer** | El clásico para freelancers globales |
| **Deel** | Pagos a contractors globales, wallet integrada |
| **Remote.com** | Similar a Deel, EOR |
| **Mercury** | Banking US para founders LATAM |
| **Brex** | Banking US enterprise |
| **Nubank** (Ultravioleta, USD) | Brasil con USD account |
| **Global66** | Chile, multi-LATAM remesas |
| **dLocal** | B2B pagos LATAM (no retail) |
| **Koywe** | Chile, on/off ramp B2B stablecoin |
| **Pomelo** | B2B issuing, no retail |

#### Competencia emergente / wallets globales

| Competidor | Foco |
|---|---|
| **Bridge.xyz (Stripe)** | Stablecoin orchestration B2B |
| **Brale** | Stablecoin issuance + ops |
| **Cobo, Privy, Web3Auth, Turnkey** | Wallet-as-a-service infra |
| **Coinbase Wallet, MetaMask** | Self-custody global |
| **Phantom** | Self-custody Solana-first |
| **Rainbow, Zerion** | Self-custody multi-chain |

### 5.2 Perfiles detallados de competidores clave

#### 5.2.1 Lemon Cash (Argentina)

- **Fundada**: 2020, Borja Martel Seward.
- **Funding**: ~USD 60M total. Seed liderada por Peak Capital; Serie A liderada por Draper Cygnus + DST Global Partners 2022 a valuación ~USD 200-300M(*).
- **Usuarios**: 2M+ reportados a fines 2024(*).
- **Producto**: app retail cripto + Lemon Card (Visa) + Lemon Earnings (cobrar del exterior) + Lemon Business.
- **Fortalezas**: brand más fuerte del segmento joven AR, tarjeta funcional, marketing.
- **Debilidades**: tuvo episodios de seguridad (caso 2022 con SIM swap), exposición regulatoria fuerte en AR, layoffs 2022-2023.
- **Tecnología pública**: Visa Pomelo, custodia mixta (BitGo y self-custody MPC, no confirmado).

#### 5.2.2 Belo (Argentina)

- **Fundada**: 2020, Manuel Beaudroit + Mariano Di Pietrantonio.
- **Funding**: ~USD 10-15M total. Mantle Ventures, Y Combinator W22, OG cripto AR.
- **Usuarios**: ~500K-1M(*).
- **Producto**: cuenta multi-moneda (USD, EUR, ARS, USDC), Belo Card, swaps cripto.
- **Fortalezas**: foco en producto, multi-moneda real, soporte decente.
- **Debilidades**: brand menos fuerte que Lemon, escala más chica.
- **Tecnología pública**: Pomelo para tarjeta, banking partner US.

#### 5.2.3 Buenbit (Argentina/México/Perú)

- **Fundada**: 2018.
- **Funding**: ~USD 15M total. Index Ventures lideró Serie A 2021.
- **Usuarios**: ~1M(*).
- **Producto**: exchange retail clásico + tasas + tarjeta crypto.
- **Fortalezas**: presencia regional temprana, exchange profundo.
- **Debilidades**: layoffs significativos 2022 post-crypto-winter, brand perdió fuerza vs Lemon/Belo.

#### 5.2.4 Bitso (México/Argentina/Brasil/Colombia)

- **Fundada**: 2014, Daniel Vogel + Pablo González + Ben Peters.
- **Funding**: ~USD 300M total. Tiger Global, Coatue, Paradigm. Unicornio 2021 a USD 2.2B.
- **Usuarios**: 8M+ reportados(*). Bitso es el gigante.
- **Producto**: 
  - Retail: exchange, cuenta MXN/BRL/COP/ARS, USD account.
  - **Bitso Business**: el competidor más serio para Takenos en B2B (procesa el corredor US-MX, partnerships con MoneyGram, etc.).
- **Fortalezas**: escala, capital, licencia IFPE MX, B2B real.
- **Debilidades**: producto retail ha sido inconsistente, UX menos polish que competencia argentina; layoffs 2022-2023.

#### 5.2.5 Ripio (Argentina/Brasil)

- **Fundada**: 2013 — el más antiguo.
- **Funding**: ~USD 70M total. Inversores diversos.
- **Producto**: exchange retail + Ripio Card + Ripio Trade (BR) + tokens propios.
- **Fortalezas**: veterano, brand reconocido, presencia BR fuerte.
- **Debilidades**: producto menos innovador, brand menos fresco que Lemon/Belo.

#### 5.2.6 Wise (Business)

- **Fundada**: 2011 (UK), Kristo Käärmann + Taavet Hinrikus.
- **Funding**: IPO Londres 2021, mkt cap ~USD 10B en 2024(*).
- **Usuarios**: 16M+ globales(*).
- **Producto**: Wise Account multi-divisa (USD, EUR, GBP, etc.), Wise Business para freelancers/empresas.
- **Fortalezas**: marca global, FX transparente, costos bajos, regulación sólida (UK FCA, EU, US estados).
- **Debilidades en LATAM**: no entrega cuenta local en ARS funcional (limitaciones AR), retiro a CBU es indirecto, no es cripto.

#### 5.2.7 Payoneer

- **Fundada**: 2005.
- **Listed NASDAQ 2021**, mkt cap ~USD 2.5B(*).
- **Usuarios**: 5M+ globales(*).
- **Producto**: el clásico — cuentas USD/EUR receptoras + Payoneer Card + payouts a banco local.
- **Fortalezas**: incumbent total en LATAM, brand massive entre freelancers, integraciones nativas Upwork/Fiverr/Amazon.
- **Debilidades**: fees altos (1%+ recibir, 2%+ FX), UX dated, soporte regular.

#### 5.2.8 Deel

- **Fundada**: 2019, Alex Bouaziz + Shuo Wang.
- **Funding**: USD 680M+ total. Última ronda 2024 a ~USD 12B valuación.
- **Producto**: pagos a contractors globales, EOR, payroll. Deel Wallet integrada.
- **Fortalezas**: enterprise muscle, capital, brand B2B, integraciones HRIS.
- **Debilidades**: foco empresa (paga), no consumidor (recibe). El freelancer LATAM lo usa como pagador, no como wallet.

#### 5.2.9 Mercury

- **Fundada**: 2017.
- **Funding**: USD ~150M, valuación ~USD 1.6B 2021(*).
- **Producto**: banking US para startups, including founders LATAM.
- **Fortalezas**: producto sólido, brand entre founders LATAM.
- **Debilidades**: necesitás LLC US, no cuenta personal, no cripto. Sufrió episodio Synapse 2024.

#### 5.2.10 Mercado Pago Cripto

- **Lanzado**: 2021-2022 dentro de MercadoLibre.
- **Producto**: cripto bolt-on (BTC, ETH, USDC) dentro de la wallet Mercado Pago.
- **Fortalezas**: distribución masiva (100M+ usuarios MELI LATAM), trust, capital infinito.
- **Debilidades**: producto cripto es "feature" no core, on/off ramp internacional limitado.
- **Amenaza para Takenos**: gigante. Si MELI decide hacer "Takenos killer" lo puede hacer en 6 meses.

### 5.3 Análisis comparativo de fees

**Caso de uso**: freelancer AR recibe USD 2.000/mes de cliente US, lo pasa a ARS.

Fees efectivos totales (entrada + FX + salida)(*):

| Operador | Fee efectivo total | Tiempo entrega ARS |
|---|---|---|
| **Takenos** | ~2-3% (declarado 0% + spread) | <24h |
| **Lemon Earnings** | ~2-3% | <24h |
| **Belo** | ~2-3% | <24h |
| **Buenbit** | ~3-4% | 1-2 días |
| **Wise** | ~1-2% (FX) + ARS via terceros | 1-3 días |
| **Payoneer + retiro local** | ~3-5% | 2-5 días |
| **Deel + retiro local** | ~2-4% | 1-3 días |
| **Bitso** | ~2-3% | <24h |
| **Bank wire SWIFT directo** | ~3-6% + liquidación MULC obligatoria | 3-7 días |

**El delta entre operadores cripto es chico** (1-2 puntos). La diferencia está en UX, soporte, features cross-sell.

### 5.4 Mapa de posicionamiento

```
                      B2B / Empresa
                          ▲
                          │
        Mercury ●         │      ● Deel
        Brex ●            │      ● dLocal
                          │      ● Bitso Business
                          │      ● Bridge.xyz/Stripe
                          │
                          │      ● Pomelo (issuing)
                          │
        Wise ●            │
        Payoneer ●        │      ● Bitso Retail
                          │      ● Takenos
        ─────────────────────────────────────────►
        Fiat-first                            Cripto-first
                          │      ● Lemon
                          │      ● Belo
                          │      ● Buenbit
                          │      ● Ripio
                          │
                          │
                          │      ● Coinbase Wallet
                          │      ● MetaMask
                          │      ● Phantom
                          ▼
                      B2C / Retail
```

### 5.5 Quién está ganando y por qué

#### Ganadores claros 2024-2025

1. **Bitso** — escala, capital, B2B real, IFPE MX. El gigante.
2. **Deel** — capital obsceno (USD 680M+), valuación USD 12B, ataca el lado pagador.
3. **Stripe (vía Bridge)** — consolidación del stablecoin payment rail. Cambia el juego para todos.
4. **Lemon** — sigue siendo el #1 retail cripto AR pero más en defensa que ataque.
5. **Mercado Pago** — sleeping giant, gana cuando quiere.

#### Perdedores / estancados

1. **Buenbit** — perdió momentum, layoffs.
2. **Ripio** — relevante pero no creció como esperado.
3. **Payoneer** — sigue rentable, pero los freelancers jóvenes ya no eligen.

#### Crecimiento real ganando share

1. **Takenos** — nicho preciso (freelancers AR/LATAM), producto enfocado, UX limpia.
2. **Belo** — multi-moneda real, ejecutando.
3. **Wise** — entrada gradual a LATAM, regulatorio sólido.

### 5.6 Gaps no cubiertos (oportunidades para nuevo entrante)

#### 5.6.1 Verticales desatendidos

1. **B2B contractors small business**: el freelancer que escala a 3-5 colaboradores. Mercury/Brex no llegan (requieren LLC US), Deel es caro. Espacio real.
2. **Agencias creativas LATAM**: cobrar de múltiples clientes globales, pagar a 5-15 contractors locales. Producto: cuentas multi-divisa + payroll + factura.
3. **Streamers / creators**: Twitch, YouTube, Onlyfans payouts globales. Producto cripto + tarjeta.
4. **Vendedores Amazon/Mercado Libre LATAM**: cobrar US, gastar local, gestionar inventario. Vertical específico con KYB + FX + B2B.
5. **Lawyers / consultants LATAM**: clientes internacionales, ticket alto, low volume. Producto con compliance LATAM + tax.
6. **Tutores online / educadores**: Italki, Preply, etc. Volumen alto, ticket bajo, requiere stack de micropagos.

#### 5.6.2 Países secundarios desatendidos

1. **Perú** — Buenbit y Bitso presentes pero light. Espacio para player local.
2. **Centroamérica** (Guatemala, Honduras, El Salvador, Nicaragua, Costa Rica, Panamá) — desatendido salvo BTC en El Salvador.
3. **República Dominicana** — diaspora masiva en US, remesas, sin player cripto serio.
4. **Paraguay** — emergente, sin competencia fuerte.
5. **Ecuador** — dolarizado nativo, oportunidad cripto rara.
6. **Bolivia** — recientemente legalizó cripto (2024), greenfield.

#### 5.6.3 Tendencias 2025-2026 emergentes

1. **Cuentas USD virtuales para LATAM**: cada freelancer tiene su routing+account US como si fuera local. Bridge habilitó esto pero la distribución LATAM-native está abierta.
2. **Tarjetas USD físicas/virtuales LATAM**: gastar directamente en USD sin pasar por moneda local. Belo tiene algo; espacio para más.
3. **Yield en stablecoins democrático**: 4-5% APY pass-through. Belo, Lemon Earnings lo intentaron; ejecución mejorable.
4. **Payroll cripto B2B**: pagar empleados/contractors en USDC y dejar que ellos manejen FX. Modelo Deel-like cripto-native.
5. **Account abstraction (ERC-4337)**: gasless transactions, batch ops, social recovery. Wallets retail van por ahí.
6. **Tesoros tokenizados (Ondo, BlackRock BUIDL)**: alternativa a USDC con yield nativo. Cambio de mix.
7. **Tarjetas para gastos crypto-nativos**: NFT, gaming, DeFi. Nicho pero rentable.

### 5.7 Qué hace bien y mal Takenos (reviews y feedback)

#### Lo que se elogia(*)

- UX limpia y rápida.
- Velocidad de conversión USD → ARS.
- Soporte por chat (mejor que el promedio del sector).
- Blog educativo.
- Onboarding KYC ágil.

#### Quejas recurrentes(*)

- KYC trabado en algunos casos (rechazos sin motivo claro).
- Fees no del todo transparentes — el spread está "escondido".
- Soporte por escala 24/7 limitado.
- Delays ocasionales en retiros cuando hay volatilidad cambiaria.
- Falta de tarjeta debit (verificar — pudieron haberla lanzado).
- Limitaciones de monto (compliance).
- Features pedidas: yield, tarjeta, FX EUR, plan business real.

### 5.8 Recomendación de posicionamiento para nuevo entrante

#### Anti-patrón (lo que NO hacer)

1. **NO competir en commodity "recibir USD"** — Lemon, Belo, Takenos, Bitso, Wise, Payoneer, Deel ya están. Mercado saturado.
2. **NO copiar el feature set** — no podés ganar siendo "yo también".
3. **NO competir en precio** — el spread es el negocio; vaciarlo es suicida.
4. **NO entrar simultáneamente a 5 países** — quemás capital en compliance/banking sin lograr densidad.

#### Patrones ganadores posibles

1. **Vertical-first**: elegir UN vertical underserved (agencias creativas, streamers, vendedores Amazon LATAM, tutores online, lawyers internacionales) y construir TODO el producto para ese segmento. Diferencial vs horizontal Takenos.
2. **País secundario-first**: Perú, RD, Paraguay, Ecuador. Ser el #1 ahí antes que el #5 en AR.
3. **B2B contractors small biz**: el "Mercury para LATAM" — cuenta business US para empresas LATAM que pagan contractors. Mercury post-Synapse dejó hueco; Deel es caro y enterprise-focused.
4. **Cripto-native treasury**: empresas Web3 que quieren operar en USDC sin convertir, con compliance LATAM. Underserved.
5. **Producto "Wise + cripto" sin la complicación**: la abuela de un freelancer puede usar Wise; nadie de cripto ofrece UX equivalente.
6. **Payroll cripto-native**: Deel cripto-first. Las empresas Web3 lo necesitan, no hay player claro.

#### Diferenciales fuertes a construir

- **Compliance superior**: ser el operador "legalmente impecable" vale oro en LATAM cripto (caso Binance Brasil 2024 mostró el riesgo).
- **UX nativa al vertical**: invoicing, contracts, tax tools integrados.
- **Soporte en español/portugués/quechua** humano y rápido.
- **Educación financiera**: el moat cultural de Lemon (blog) es real.
- **Integración con plataformas verticales**: Upwork no es socio de nadie todavía.

---

## 6. Roadmap recomendado

### Fase 0 — Validación / MVP (Mes 0-6)

**Objetivo**: 100-500 usuarios pilotos cobrando del exterior.

**Estructura**:
- Holding Cayman o Delaware (USD 15K).
- Banking US: Mercury (gratis) o Brex.
- Sin entidad local todavía.

**Stack 100% partners**:
- Bridge.xyz o Brale (cuenta virtual US + USDC).
- Privy o Turnkey (user wallets).
- Sumsub (KYC).
- TRM Labs o Chainalysis (AML on-chain).
- Notabene (Travel Rule).
- Manteca (off-ramp AR) o partner local del país elegido.
- Pomelo (si tarjeta es prioridad post-MVP).

**Producto**:
- Signup + KYC.
- Cuenta virtual US (ACH/wire).
- Auto-conversión a USDC.
- Withdraw a banco local (1 país).
- Send/receive on-chain (USDC Polygon + USDT Tron).

**Equipo**: 2 founders + 2-3 devs + 1 design + 1 ops/compliance fractional.

**Costo total**: USD 50-150K (mostly burn payroll).

**Métricas a observar**: signups, activación (signup → 1ª tx), volumen mensual, NPS de 50 usuarios beta.

### Fase 1 — Product-Market Fit (Mes 6-18)

**Objetivo**: 3-10K usuarios activos, USD 5-15M/mes procesado.

**Estructura**:
- Sociedad local en país núcleo (elegir entre Uruguay, Chile, México, según mercado primario).
- Registro como reportante AML (UIAF/UAF/UIF/SENACLAFT).
- Comenzar trámite licencia en mercado principal (si va a haber).

**Stack**:
- Mantener Bridge/Brale.
- Sumar Fireblocks tier inicial (custodia operativa propia).
- ComplyAdvantage (sanctions/PEP).
- Datadog + Sentry + PagerDuty.

**Producto**:
- Multi-país on-ramp (3-4 destinos LATAM).
- Tarjeta debit (vía Pomelo) en al menos AR/UY/MX.
- Plus membership (USD 7-12/mes).
- Yield pass-through (3% APY).
- Referral program.

**Equipo**: 8-15 personas. Compliance officer in-house. CS team de 2-3.

**Costo total fase 1**: USD 800K-1.5M.

**Métricas críticas**:
- Activación >35%
- ARPU mensual >USD 25
- Contribution margin >70%
- Churn <8%
- LTV/CAC >4x
- NPS >40

### Fase 2 — Escala (Mes 18-36)

**Objetivo**: 30-80K activos, USD 80-200M/año procesado, presencia 5+ países.

**Estructura**:
- Licencia propia en 1-2 mercados grandes (PSAV Argentina, IFPE México vía partner).
- Subsidiarias locales en cada país operado.
- Equipo legal/compliance interno multi-país.
- Auditorías AML y proof of reserves anuales.

**Producto**:
- Cuenta multi-moneda (USD + EUR + ARS + MXN + BRL + COP).
- Tarjetas Plus/Premium tiered.
- Inversiones (yield + DCA Bitcoin).
- B2B cuenta business para freelancers escalando.
- API pública para integraciones.

**Equipo**: 40-80 personas.

**Costo total fase 2**: USD 3-7M/año.

**Métricas**:
- Revenue anual USD 15-40M.
- Contribution margin >75%.
- EBITDA breakeven o positivo.
- Listo para Serie B / IPO path o adquisición.

### Fase 3 — Consolidación regional (Mes 36+)

**Opciones**:
1. **Crecimiento orgánico** hacia neobank LATAM completo (Bitso path).
2. **Adquisición** por incumbent (MELI, Nubank, Wise, Stripe).
3. **IPO** local (BR via Nasdaq).

---

## 7. Checklist de verificación previa al lanzamiento

### Antes de gastar capital serio, contratar estudios locales para confirmar:

#### Argentina
- [ ] Listado actual PSAV CNV (cnv.gov.ar) — ver si Takenos figura.
- [ ] Texto vigente RG CNV 1058 y modificatorias 2025-2026 (capital mínimo actualizado).
- [ ] Comunicación A BCRA aplicable a PSP-CPSI (últimas modificatorias).
- [ ] Estado del CEPO / régimen cambiario 2026.
- [ ] Régimen UIF Res 49/2024 y modificaciones.

#### México
- [ ] Status real de Bitso, Bitso International, Belo MX en CNBV.
- [ ] Resolución SHCP/Banxico aplicable a IFPE — Circular 4/2019 y modificaciones.
- [ ] Costos reales de licencia IFPE 2026 (capital mínimo en UDIs).

#### Brasil
- [ ] Resoluciones BACEN definitivas para PSAV (post consultas públicas 109/110/111).
- [ ] Costos y plazos VASP + IP definitivos.
- [ ] Status COAF reporting requirements.

#### Colombia
- [ ] Estado del proyecto de ley cripto 2026.
- [ ] Última versión Circular 011 Superfinanciera.

#### Chile, Perú, Uruguay
- [ ] Reglamentaciones finales CMF (Chile), promulgación ley cripto (Perú), circulares BCU (Uruguay).

#### Estados Unidos
- [ ] Listado de partners US activos: Bridge.xyz post-Stripe, Brale, Conduit, Felix, Layer2.
- [ ] Bond y capital MTL por estado US (NMLS Resource Center).
- [ ] Status Mercury post-Synapse, alternativas (Relay, Brex, Column directo).

#### Operacional
- [ ] Quotes reales de Fireblocks, BitGo para tu volumen proyectado.
- [ ] Quotes reales de Sumsub, Persona, Truora para tu volumen KYC.
- [ ] Hablar con 2-3 estudios cripto locales por país objetivo:
  - **AR**: Bruchou, PAGBAM, Marval, Beccar Varela.
  - **MX**: Galicia, Creel, Mijares Angoitia.
  - **BR**: Mattos Filho, Pinheiro Neto, Veirano.
  - **US**: Davis Polk Fintech, Sullivan & Cromwell.
- [ ] Presupuestar USD 50-80K solo en legal exploratorio antes de constituir.

### Compliance consultancies regionales

- **Notabene** (Travel Rule + consultancy).
- **Sumsub Consulting**.
- **BLP** (Centro de Estudios Latinoamericano).
- **Carey, Brigard Urrutia**.

### Validar fees y producto en vivo

- [ ] Visitar takenos.com/fees, lemon.com.ar, belo.app, buenbit.com — armar tabla comparativa real hoy.
- [ ] Crear cuentas de prueba en 3-4 competidores y medir UX end-to-end.
- [ ] Leer reviews recientes en App Store, Google Play, Trustpilot, Reddit r/argentina, r/merval.
- [ ] Hablar con 20 freelancers que reciben USD del exterior — entender pain points reales.

### Validar economía

- [ ] Confirmar contribution margin con quotes reales de Bridge.xyz/Stripe, Conduit, Manteca, Koywe.
- [ ] Modelar P&L conservador, base y optimista.
- [ ] Definir gates de financiamiento (Seed → Serie A: a qué métricas).

---

## Cierre

Construir una billetera tipo Takenos en LATAM en 2026 es **viable pero exigente**. Los tres factores críticos:

1. **Capital paciente**: USD 1-1.5M para 1 país en 12-18 meses; USD 8-15M para escalar a 5 países en 36 meses.
2. **Banking/compliance moat**: el verdadero diferenciador no es el código, son las relaciones con bancos US, custodios cripto y reguladores LATAM. Tarda años de construir.
3. **Nicho diferenciador**: competir en horizontal contra 6 jugadores establecidos con USD 10-300M raised es perder. Verticalizar o ir a país secundario.

Si tenés capital y stomach, **el mercado todavía está en expansión** (USD 70-120B/año en flujos LATAM tech freelancers, creciendo 15-25% YoY) y los gigantes (MELI, Nubank, Stripe vía Bridge) atacan desde arriba, no desde abajo — dejan espacio para players verticales o regionales focalizados.

**Próximos pasos sugeridos**:

1. Validar hipótesis de nicho con 30-50 entrevistas a clientes objetivo.
2. Verificar números de este informe en vivo (links oficiales, páginas de fees, Crunchbase).
3. Conseguir 3-5 cartas de intención de clientes pilotos.
4. Armar deck pre-seed con TAM/SAM/SOM, contribution margin y roadmap.
5. Levantar USD 800K-1.5M de pre-seed con investors LATAM cripto-friendly (LatitudVC, Hi Ventures, Kaszek seed, NXTP, ángeles ex-MELI/ex-Lemon/ex-Bitso).

---

*Fin del informe. Re-verificar con fuentes oficiales antes de tomar decisiones operativas. Última actualización conocimiento: enero 2026.*
