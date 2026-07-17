# Sistema de referidos NÜRO — investigación y diseño

Modelo elegido: **1 nivel (referido directo) + recompensa en SALDO/CRÉDITOS internos.**
Investigado en la web (jul 2026) y cruzado con lo que NÜRO ya tiene. Fuentes al final.

---

## 1. Qué tipo de programa es (y por qué es el correcto)

Lo que quieres NO es un MLM: es un **programa de referidos de cliente** con recompensa
en la "moneda del propio producto" (créditos/saldo). Es el modelo **Dropbox / Canva**,
considerado el "estándar de oro":

- Dropbox regalaba espacio por cada amigo referido → creció **3900% en 15 meses**.
- La clave: **la recompensa se paga en tu propia moneda** (créditos), costo marginal casi cero.

**Ventaja legal (importante):** un referido de **1 nivel**, **gratis de participar**, donde
la recompensa se paga por una **venta/pago real** (no por reclutar), **NO es esquema
piramidal**. Los pirámides pagan por reclutar sin producto real; aquí se paga porque el
referido **paga su plan**. Aun así: **términos claros y públicos** (regla FTC).

---

## 2. Cómo funciona el flujo (los 4 pasos universales)

```
1. COMPARTIR   El usuario copia su código/link desde el panel (o usa su username).
2. REGISTRO    El nuevo usuario se registra con ese código → se "estampa" el
               referrerId en su cuenta (queda como su referido directo).
3. PAGO        Cuando el referido PAGA su plan (no al registrarse), se dispara la
               comisión. ← este es el punto clave.
4. RECOMPENSA  Se acredita el saldo/créditos al referidor (idempotente, una sola vez).
```

**Regla de oro (de la investigación):** premiar en el **evento de pago** (`invoice.paid`),
NO en el registro. tl;dv logró 30% más conversión premiando el pago, no el signup. Y hace
el fraude mucho más difícil (un registro falso no paga → no genera comisión).

---

## 3. Qué se necesita para CALCULAR la comisión

Fórmula simple (1 nivel):
```
comisión = pago_del_referido × PORCENTAJE     (ej. 20%)
        o = monto_fijo por referido que paga  (ej. $5 en créditos)
```
Decisiones a definir contigo:
- **% o monto fijo** por referido que paga.
- **Una vez** (primer pago) o **recurrente** (cada mes que el referido siga pagando).
- **Tope** opcional (ej. máx X créditos/mes) para controlar costo.

---

## 4. Datos que hay que agregar (mapeado a las tablas de NÜRO)

NÜRO ya tiene lo más difícil: **saldo interno** en el modelo `User`
(`aiCredits` y `aiBalanceUsd`), planes y pagos. Solo falta la capa de referidos:

**En `User` (tabla `users`):**
| Campo | Tipo | Para qué |
|-------|------|----------|
| `referralCode` | String @unique (indexado) | el código del usuario (o usar `username`) |
| `referredById` | String? (FK a users.id) | quién lo refirió (su referidor directo) |
| `referralCount` | Int @default(0) | cuántos ha referido (para mostrar rápido) |

**Nueva tabla `Referral` (`referrals`):**
| Campo | Para qué |
|-------|----------|
| `id` | PK |
| `referrerId` | FK → el que refiere (gana) |
| `referredId` | FK → el referido (paga). **@unique** = cada usuario se cuenta 1 vez |
| `status` | `PENDING` (registrado, no ha pagado) / `COMPLETED` (pagó, comisión dada) / `REJECTED` |
| `rewardAmount` | cuánto se acreditó |
| `createdAt` / `completedAt` | fechas |

**Registro de saldo (ledger) — reusar/extender lo de créditos:**
Cada comisión escribe un movimiento (motivo: "Comisión por referido X") que suma a
`aiBalanceUsd`/créditos. Así el saldo es **auditable** (de dónde salió cada crédito).

> **Idempotencia** (crítico para no pagar doble): la comisión se marca por `Referral`
> (o por `paymentId`) para que aunque el webhook de pago llegue 2 veces, se pague **una sola vez**.

---

## 5. El "cobro y pago" (cómo entra y sale el dinero)

- **Cobro:** NÜRO ya cobra los planes (Stripe / QR / comprobante). La comisión se dispara
  cuando **ese pago se confirma** (webhook de Stripe `invoice.paid`, o cuando el admin
  aprueba el comprobante).
- **Pago al referidor:** como elegiste **saldo interno**, NO hay que sacar dinero ni hacer
  transferencias ni KYC. La comisión se vuelve **saldo/créditos NÜRO** que el referidor usa
  para **pagar su propio plan o comprar créditos de IA**. Esto es lo más simple, barato y
  sin riesgo legal/contable (no manejas retiros de efectivo).

---

## 6. La "vista de árbol"

Con **1 nivel NO hace falta un árbol** — un árbol solo tiene sentido en MLM multinivel.
Lo correcto aquí es una pantalla **"Mis referidos"**:

```
Tu código: MARCO2026        [Copiar link]  agentenuro.com/r/MARCO2026

Referidos: 12   ·   Activos (pagando): 8   ·   Ganado: 240 créditos

┌──────────────┬────────────┬───────────┬────────────┐
│ Usuario      │ Se registró│ Estado    │ Comisión   │
├──────────────┼────────────┼───────────┼────────────┤
│ ana_ventas   │ 12 jul     │ ● Pagando │ +20 créd.  │
│ juanp        │ 10 jul     │ ○ Pendiente│    —       │
└──────────────┴────────────┴───────────┴────────────┘
```
(Si algún día quieres multinivel, ahí sí se agrega el árbol — pero eso es otro modelo,
más complejo y más regulado.)

---

## 7. Prevención de fraude (imprescindible)

Sin defensas, el fraude es 10–30% del programa; con defensas básicas baja a <5%.
Para NÜRO:
1. **No auto-referirse:** bloquear si `referredById == self`; comparar **IP / device / email**
   (bloquear alias tipo `juan+1@gmail.com`).
2. **Premiar el pago, no el registro** (ya cubierto) → un registro falso no cobra.
3. **Verificar email** (doble opt-in) en el registro.
4. **Tope** de comisiones/mes y **alertas** por patrones raros (muchos referidos misma IP).
5. **Idempotencia** por pago (no pagar dos veces el mismo evento).

---

## 8. Resumen de lo que hay que construir

1. Migración: agregar `referralCode`, `referredById`, `referralCount` a `users` + tabla `referrals`.
2. Generar `referralCode` (o usar username) + link `agentenuro.com/r/<code>`.
3. Registro: aceptar `?ref=<code>` (o `/r/<code>`), validar, estampar `referredById`, crear `Referral` PENDING.
4. En la confirmación de pago del plan: buscar `referredById`, si hay y el `Referral` está PENDING →
   acreditar saldo al referidor, marcar COMPLETED, escribir movimiento (idempotente).
5. Pantalla "Mis referidos" (lista + código + link + total ganado).
6. Panel admin: ver referidos, ajustar %/monto, revisar fraude.
7. Términos públicos del programa.

Esfuerzo estimado: **1 nivel + saldo interno es el más barato de construir** (NÜRO ya tiene
saldo y pagos). Sin retiros, sin árbol, sin cripto obligatoria.

---

## Fuentes
- Cello — Referral Programs for SaaS (build guide): https://cello.so/what-is-referral-program-build-saas/
- track360 — SaaS referral program examples 2026: https://track360.io/blog/saas-referral-program-examples-2026
- Viral Loops — B2C vs B2B SaaS referral rewards: https://viral-loops.com/blog/saas-referral-program-2/
- Coderbased — DB schema multi-level referral: https://www.coderbased.com/p/sql-db-design-multi-level-referral-system
- DEV.to — System design of a referral system: https://dev.to/vaib215/system-design-of-a-referral-system-4hik
- Fathom Analytics — How we built our referral program: https://usefathom.com/blog/how-we-built-our-referral-program
- Talkable — Preventing referral fraud: https://www.talkable.com/blog/preventing-referral-program-fraud
- Voucherify — Combat referral abuse & fraud: https://www.voucherify.io/blog/blowing-the-whistle-how-to-combat-referral-abuse-and-fraud
- FTC — Business guidance concerning MLM (piramidal vs referido): https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing
- Antwort Law — Referral programs vs pyramids (legalidad): https://antwort-law.com/en/publications/referalnye-programmy-i-piramidy-kak-opredelit-legalnost
