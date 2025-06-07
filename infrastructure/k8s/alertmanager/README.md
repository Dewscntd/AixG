# Alertmanager UI Access Configuration

This directory contains the Kubernetes and Istio configurations for securely exposing the Alertmanager UI.

## Components

1. **VirtualService**: Defines routing rules for Alertmanager traffic
2. **Gateway**: Configures TLS termination and port exposure
3. **AuthorizationPolicy**: Controls access to the Alertmanager UI
4. **DestinationRule**: Sets up traffic policies and mTLS

## Access URL

The Alertmanager UI is accessible at: `https://alertmanager.footanalytics.com`

## Authentication

Access to the Alertmanager UI is restricted to:

- Service accounts in the `istio-system` namespace
- The `ml-pipeline` service account in the `default` namespace
- Users with the `monitoring-admins` or `platform-team` groups in their JWT claims

## Deployment

These resources are deployed as part of the Terraform infrastructure setup. The main configuration is in:

- `/infrastructure/terraform/modules/alertmanager/main.tf`
- `/infrastructure/terraform/modules/alertmanager/values.yaml`

## Troubleshooting

If you encounter access issues:

1. Check that your JWT token contains the required group claims
2. Verify the Istio AuthorizationPolicy is correctly applied
3. Ensure the TLS certificate for `alertmanager.footanalytics.com` is valid
4. Check Istio ingress gateway logs for any routing errors

```bash
# Check AuthorizationPolicy status
kubectl get authorizationpolicy -n monitoring

# Verify VirtualService configuration
kubectl get virtualservice -n monitoring alertmanager -o yaml

# Check if pods are running
kubectl get pods -n monitoring -l app=alertmanager
```