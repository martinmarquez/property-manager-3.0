# AFIP WSAA Sandbox (Homologacion) Setup

This documents how to provision AFIP WSAA certificates for the CAE sandbox
environment used in Phase G electronic invoicing (WSFEv1).

## Prerequisites

- Argentine CUIT registered as a company (not monotributo for CAE B/A)
- Access to the AFIP web portal (https://auth.afip.gob.ar/)
- AFIP web services enabled for homologacion on the CUIT

## Step 1 — Generate Private Key + CSR

```bash
mkdir -p infra/afip/certs
cd infra/afip/certs

# Generate 2048-bit RSA private key (never commit this)
openssl genrsa -out afip-wsaa-sandbox.key 2048

# Generate CSR — fill in the prompts with company details
openssl req -new -key afip-wsaa-sandbox.key -out afip-wsaa-sandbox.csr \
  -subj "/C=AR/O=<Company Name>/CN=<CUIT>/<email>"
```

## Step 2 — Register Certificate on AFIP Portal

1. Log in to https://auth.afip.gob.ar/ with the company CUIT
2. Navigate: **Administrador de Relaciones** → **Nueva Relación** → **Web Services**
3. Select service: **wsfe** (producción) or **wsfehomo** (homologacion sandbox)
4. Upload the CSR file (`afip-wsaa-sandbox.csr`)
5. Download the signed certificate (`afip-wsaa-sandbox.crt`)

For homologacion, use the test CUIT `20111111112` provided by AFIP for dev testing,
or request sandbox access for your real CUIT at:
https://www.afip.gob.ar/ws/documentacion/ws-afip.asp

## Step 3 — Configure Homologacion Endpoint

The WSAA sandbox endpoints differ from production:

| Service | Sandbox URL |
|---------|-------------|
| WSAA login | `https://wsaahomo.afip.gov.ar/ws/services/LoginCms` |
| WSFEv1 | `https://wswhomo.afip.gov.ar/wsfev1/service.asmx` |

## Step 4 — Store Secrets in GitHub

Add the following GitHub secrets (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `AFIP_CUIT` | Company CUIT (numeric, no dashes) |
| `AFIP_PRIVATE_KEY` | Contents of `afip-wsaa-sandbox.key` (base64-encoded) |
| `AFIP_CERTIFICATE` | Contents of `afip-wsaa-sandbox.crt` (base64-encoded) |
| `AFIP_SANDBOX` | `true` for staging, `false` for production |

To base64-encode the key for GitHub secrets:

```bash
base64 -i afip-wsaa-sandbox.key | tr -d '\n'
base64 -i afip-wsaa-sandbox.crt | tr -d '\n'
```

## Step 5 — App Environment Variables

The API and Worker services need these env vars (set in Fly.io secrets):

```bash
flyctl secrets set \
  AFIP_CUIT="<your-cuit>" \
  AFIP_PRIVATE_KEY="$(base64 -i infra/afip/certs/afip-wsaa-sandbox.key | tr -d '\n')" \
  AFIP_CERTIFICATE="$(base64 -i infra/afip/certs/afip-wsaa-sandbox.crt | tr -d '\n')" \
  AFIP_SANDBOX="true" \
  --app corredor-api-prod
```

## Notes

- The WSAA token (`TA`) has a 12-hour TTL. The API must cache and refresh it.
- Certificate validity on AFIP homologacion: 2 years from issuance.
- Never commit `*.key` or `*.crt` files to git. The `.gitignore` covers `infra/afip/certs/`.
- Production CUIT must be different from the sandbox CUIT `20111111112`.
