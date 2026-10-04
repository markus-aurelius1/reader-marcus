---
title: Digital Payments
taxonomy: prelims-economy-and-social-development-money-banking-and-financial-system-digital-payments
---

## Regulatory Architecture {#regulatory-architecture}

- {{`Payment and Settlement Systems Act, 2007`}} → RBI regulates and supervises payment systems; operators need RBI authorisation.
- **RBI-operated** → {{RTGS, NEFT}}.
- **NPCI** → incorporated {{2008}}, not-for-profit (Section 8) company; promoted by banks with RBI / IBA; runs retail rails under RBI oversight.

> [!TRAP] RTGS / NEFT are !!not!! NPCI systems. · NPCI is not a government department or a statutory body.

## RTGS · NEFT · IMPS · UPI {#rtgs-neft-imps-upi}

| | RTGS | NEFT | IMPS | UPI |
|---|---|---|---|---|
| Operator | RBI | RBI | NPCI | NPCI |
| Settlement | {{Real-time, gross, one by one}} | {{Half-hourly batches}} | Instant | Instant |
| Hours | 24×7 | 24×7 | 24×7 | 24×7 |
| Use | Large value | General transfers | Retail instant | Mobile, QR, P2P, P2M |
| Minimum | Prescribed minimum | None | — | — |

- Inward RTGS / NEFT → {{no charge to the customer}}.

> [!TRAP] "RTGS has limited hours, NEFT is 24×7" → obsolete; both run round the clock.

## NPCI Products {#npci-products}

| Product | Function |
|---|---|
| **UPI** | Instant account-to-account interface; push and collect, QR, VPA |
| **BHIM** | NPCI's UPI app — UPI is the rail, BHIM one app |
| **RuPay** | Domestic card network |
| **IMPS** | Instant interbank retail transfer |
| **NFS** | {{Shared ATM network / switch}} |
| **AePS** | Aadhaar-authenticated transactions via BC / micro-ATM |
| **NACH** | Bulk recurring payments and collections |
| **NETC / FASTag** | Electronic toll |

Aadhaar authentication, UIDAI → [Polity: Aadhaar & UIDAI](@prelims/polity/governance-regulators#aadhaar-and-uidai)

## UPI, MDR & Data Localisation {#upi-mdr-data}

### UPI
- No {{pre-funded wallet}} needed → moves money straight between bank accounts.
- Third-party app = front end; funds stay in the bank.
- UPI → payment rail. !!Not!! legal tender.

### MDR
- Merchant Discount Rate → fee {{borne by the merchant}} for accepting card / digital payment; shared among acquirer, network, issuer.
- Not an incentive paid by the bank to the merchant.

### Data localisation (RBI, 2018)
- {{Entire payment data stored only in India}}; foreign leg may also be kept abroad.
- Compliance → System Audit Report by CERT-In-empanelled auditors → submitted to RBI.

> [!TRAP] Localisation does !!not!! require payment systems to be public-sector owned.

> [!DYN] UPI's overseas acceptance list, transaction limits, zero-MDR rules — never fix a country count.

## UPI vs e₹ vs e-RUPI {#upi-cbdc-erupi}

| | UPI | e₹ (CBDC) | e-RUPI |
|---|---|---|---|
| What | Payment interface | {{Sovereign digital currency}} | Prepaid purpose-specific voucher |
| Liability | {{Commercial-bank deposit moves}} | {{RBI's liability}} | Issuer's voucher claim |
| Legal tender | No | Yes | No |
| Institution | NPCI + banks | RBI | NPCI platform + issuers |

CBDC design → [Digital Rupee](@money-rbi-monetary-policy#cbdc)
