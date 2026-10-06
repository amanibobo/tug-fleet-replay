#!/usr/bin/env bash
# Create an IoT thing, certificate and least-privilege policy for the replayer.
# Writes the credentials to infra/.certs/ (gitignored) and prints the MQTT endpoint.
#
#   infra/scripts/iot_provision.sh [thing-name]        (default: tug-replayer)
#
# Needs the AWS CLI v2 with credentials that may call iot:* (one-time, by an admin).
# Idempotent: re-running reuses the existing thing, policy and certificate files.
set -euo pipefail

THING="${1:-tug-replayer}"
POLICY="${THING}-publish"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${HERE}/../.certs"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-$(aws configure get region || true)}}"
if [[ -z "${REGION}" ]]; then
  echo "error: set AWS_REGION (or configure a default region)" >&2
  exit 2
fi
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
mkdir -p "${CERT_DIR}"
chmod 700 "${CERT_DIR}"

echo "region ${REGION}, account ${ACCOUNT}, thing ${THING}"

# --- thing -----------------------------------------------------------------------------------
if aws iot describe-thing --thing-name "${THING}" --region "${REGION}" >/dev/null 2>&1; then
  echo "thing ${THING} exists"
else
  aws iot create-thing --thing-name "${THING}" --region "${REGION}" \
    --attribute-payload '{"attributes":{"project":"tug-replay"}}' >/dev/null
  echo "created thing ${THING}"
fi

# --- policy: connect as this client id, publish only to tugs/*/telemetry -------------------------
POLICY_DOC=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:${REGION}:${ACCOUNT}:client/${THING}*"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "arn:aws:iot:${REGION}:${ACCOUNT}:topic/tugs/*/telemetry"
    }
  ]
}
JSON
)
if aws iot get-policy --policy-name "${POLICY}" --region "${REGION}" >/dev/null 2>&1; then
  echo "policy ${POLICY} exists"
else
  aws iot create-policy --policy-name "${POLICY}" --policy-document "${POLICY_DOC}" --region "${REGION}" >/dev/null
  echo "created policy ${POLICY}"
fi

# --- certificate ------------------------------------------------------------------------------
CERT_FILE="${CERT_DIR}/certificate.pem.crt"
KEY_FILE="${CERT_DIR}/private.pem.key"
PUB_FILE="${CERT_DIR}/public.pem.key"
ARN_FILE="${CERT_DIR}/certificate.arn"
CA_FILE="${CERT_DIR}/AmazonRootCA1.pem"

if [[ -f "${CERT_FILE}" && -f "${KEY_FILE}" && -f "${ARN_FILE}" ]]; then
  CERT_ARN="$(cat "${ARN_FILE}")"
  echo "reusing certificate ${CERT_ARN}"
else
  CERT_ARN="$(aws iot create-keys-and-certificate --set-as-active --region "${REGION}" \
    --certificate-pem-outfile "${CERT_FILE}" \
    --public-key-outfile "${PUB_FILE}" \
    --private-key-outfile "${KEY_FILE}" \
    --query certificateArn --output text)"
  echo "${CERT_ARN}" > "${ARN_FILE}"
  chmod 600 "${KEY_FILE}"
  echo "created certificate ${CERT_ARN}"
fi

aws iot attach-policy --policy-name "${POLICY}" --target "${CERT_ARN}" --region "${REGION}"
aws iot attach-thing-principal --thing-name "${THING}" --principal "${CERT_ARN}" --region "${REGION}"

if [[ ! -f "${CA_FILE}" ]]; then
  curl -fsSL https://www.amazontrust.com/repository/AmazonRootCA1.pem -o "${CA_FILE}"
fi

# --- endpoint ---------------------------------------------------------------------------------
ENDPOINT="$(aws iot describe-endpoint --endpoint-type iot:Data-ATS --region "${REGION}" --query endpointAddress --output text)"
echo "${ENDPOINT}" > "${CERT_DIR}/endpoint.txt"

cat > "${CERT_DIR}/replayer.env" <<ENV
# source this before running the replayer (paths are absolute)
export TUG_IOT_ENDPOINT=${ENDPOINT}
export TUG_IOT_CLIENT_ID=${THING}
export TUG_IOT_CERT=$(cd "${CERT_DIR}" && pwd)/certificate.pem.crt
export TUG_IOT_KEY=$(cd "${CERT_DIR}" && pwd)/private.pem.key
export TUG_IOT_CA=$(cd "${CERT_DIR}" && pwd)/AmazonRootCA1.pem
ENV

echo
echo "MQTT endpoint: ${ENDPOINT}:8883 (TLS, client id ${THING})"
echo "credentials in ${CERT_DIR}/ ; load them with:  source ${CERT_DIR}/replayer.env"
echo "test publish: aws iot-data publish --region ${REGION} --topic tugs/000000000/telemetry --cli-binary-format raw-in-base64-out --payload '{\"tug_id\":\"000000000\",\"t\":\"2024-12-02T00:00:00Z\"}'"
