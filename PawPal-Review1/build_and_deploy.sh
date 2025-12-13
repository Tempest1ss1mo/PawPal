#! /bin/bash

export PROJECT_ID=
export REGION=
export CONNECTION_NAME=

~/google-cloud-sdk/bin/gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/pawpal-review \
  --project $PROJECT_ID

~/google-cloud-sdk/bin/gcloud run deploy pawpal-review \
  --image gcr.io/$PROJECT_ID/pawpal-review \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances $CONNECTION_NAME \
  --project $PROJECT_ID