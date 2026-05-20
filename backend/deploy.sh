#!/bin/bash
# Google Cloud Run deploy automation script for ServicePilot AI backend

PROJECT_ID=${GCP_PROJECT_ID:-"servicepilot-ai"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="servicepilot-backend"

echo "🚀 Starting Google Cloud build for ${SERVICE_NAME}..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME}

echo "🛡️ Deploying container to Google Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars DATABASE_URL="mysql+pymysql://root:password@10.0.0.1/servicepilot"

echo "✓ Deployment complete!"
