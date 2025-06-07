# Platform Outage Runbook

## 🚨 **Alert Information**

**Alert Name**: `PlatformAvailabilityCritical`  
**Severity**: Critical  
**Response Time**: 5 minutes  
**Escalation Time**: 15 minutes  

### Trigger Conditions
- Platform availability < 99% for 2+ minutes
- Complete API Gateway unavailability
- Multiple service failures
- User-facing functionality completely unavailable

### Expected Impact
- **Users**: Cannot access platform
- **Business**: Revenue loss, customer dissatisfaction
- **SLO**: Major error budget consumption

## ⚡ **Quick Assessment (2 minutes)**

### Immediate Checks
```bash
# 1. Check overall platform health
curl -f https://api.footanalytics.com/health
# Expected: HTTP 200 with {"status": "healthy"}

# 2. Check API Gateway pods
kubectl get pods -n footanalytics -l app.kubernetes.io/name=api-gateway
# Expected: All pods in Running state

# 3. Check ingress status
kubectl get ingress -n footanalytics api-gateway
# Expected: Ingress has valid IP address

# 4. Check node health
kubectl get nodes
# Expected: All nodes in Ready state
```

### Key Metrics to Review
1. **Platform Availability**: Should be > 99%
2. **Error Rate**: Should be < 1%
3. **Response Time**: Should be < 200ms P95
4. **Pod Status**: All critical pods Running

### Initial Triage Questions
- [ ] Is this a complete outage or partial degradation?
- [ ] Are all services affected or specific components?
- [ ] Was there a recent deployment or change?
- [ ] Are there any infrastructure alerts?

## 🔍 **Investigation Steps**

### Step 1: Service Status Assessment
```bash
# Check all critical services
kubectl get pods -n footanalytics
kubectl get pods -n ai-processing
kubectl get pods -n monitoring

# Check service endpoints
kubectl get endpoints -n footanalytics
kubectl describe service api-gateway -n footanalytics

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=50
```

### Step 2: Infrastructure Health
```bash
# Check node resources
kubectl top nodes
kubectl describe nodes

# Check cluster events
kubectl get events --sort-by='.lastTimestamp' --all-namespaces | head -20

# Check persistent volumes
kubectl get pv
kubectl get pvc -A
```

### Step 3: Recent Changes Analysis
```bash
# Check recent deployments
kubectl get deployments -A -o wide
kubectl rollout history deployment/api-gateway -n footanalytics

# Check ArgoCD applications
argocd app list
argocd app get api-gateway

# Check recent Git commits
git log --oneline -10
```

### Step 4: Network Connectivity
```bash
# Test internal service connectivity
kubectl exec -n footanalytics deployment/api-gateway -- \
  curl -f http://postgres.footanalytics:5432

# Test external dependencies
kubectl exec -n footanalytics deployment/api-gateway -- \
  curl -f https://api.external-service.com/health

# Check DNS resolution
kubectl exec -n footanalytics deployment/api-gateway -- \
  nslookup postgres.footanalytics.svc.cluster.local
```

### Step 5: Database Health
```bash
# Check PostgreSQL status
kubectl exec -n footanalytics deployment/postgres -- \
  pg_isready -h localhost -p 5432

# Check database connections
kubectl exec -n footanalytics deployment/postgres -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check database logs
kubectl logs -n footanalytics deployment/postgres --tail=100
```

## 🛠️ **Resolution Steps**

### Scenario A: API Gateway Pod Failures

#### Step A1: Restart Failed Pods
```bash
# Delete failed pods (they will be recreated)
kubectl delete pods -n footanalytics -l app.kubernetes.io/name=api-gateway --field-selector=status.phase!=Running

# Wait for pods to restart
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=api-gateway -n footanalytics --timeout=300s

# Verify health
curl -f https://api.footanalytics.com/health
```

#### Step A2: Scale Up if Needed
```bash
# Check current replica count
kubectl get deployment api-gateway -n footanalytics

# Scale up if insufficient replicas
kubectl scale deployment api-gateway --replicas=5 -n footanalytics

# Monitor scaling
kubectl get pods -n footanalytics -l app.kubernetes.io/name=api-gateway -w
```

### Scenario B: Database Connection Issues

#### Step B1: Check Database Connectivity
```bash
# Test database connection from API Gateway
kubectl exec -n footanalytics deployment/api-gateway -- \
  pg_isready -h postgres.footanalytics -p 5432 -U postgres

# Check database pod status
kubectl get pods -n footanalytics -l app.kubernetes.io/name=postgres
kubectl describe pod -n footanalytics -l app.kubernetes.io/name=postgres
```

#### Step B2: Restart Database if Needed
```bash
# Check database logs first
kubectl logs -n footanalytics deployment/postgres --tail=200

# Restart database pod if necessary
kubectl delete pod -n footanalytics -l app.kubernetes.io/name=postgres

# Wait for database to be ready
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=postgres -n footanalytics --timeout=300s
```

### Scenario C: Ingress/Load Balancer Issues

#### Step C1: Check Ingress Controller
```bash
# Check ingress controller status
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100

# Check ingress configuration
kubectl describe ingress api-gateway -n footanalytics
```

#### Step C2: Restart Ingress Controller
```bash
# Restart ingress controller if needed
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx

# Wait for rollout to complete
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx
```

### Scenario D: Node Resource Exhaustion

#### Step D1: Check Node Resources
```bash
# Check node resource usage
kubectl top nodes
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check for resource pressure
kubectl get nodes -o wide
kubectl describe node <node-name> | grep -A 10 Conditions
```

#### Step D2: Scale Cluster if Needed
```bash
# Add new nodes (if using managed node groups)
aws eks update-nodegroup-config \
  --cluster-name footanalytics-cluster \
  --nodegroup-name main-nodes \
  --scaling-config minSize=3,maxSize=10,desiredSize=5

# Or trigger cluster autoscaler
kubectl patch deployment cluster-autoscaler -n kube-system -p \
  '{"spec":{"template":{"metadata":{"annotations":{"cluster-autoscaler.kubernetes.io/safe-to-evict":"false"}}}}}'
```

## ✅ **Verification Steps**

### Step 1: Health Check Verification
```bash
# Test API Gateway health
curl -f https://api.footanalytics.com/health
# Expected: {"status": "healthy", "timestamp": "..."}

# Test GraphQL endpoint
curl -X POST https://api.footanalytics.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health }"}'
# Expected: {"data": {"health": "OK"}}
```

### Step 2: Service Functionality Test
```bash
# Test video upload endpoint
curl -f https://api.footanalytics.com/api/v1/videos/upload/presigned
# Expected: HTTP 200 with presigned URL

# Test user authentication
curl -f https://api.footanalytics.com/api/v1/auth/me \
  -H "Authorization: Bearer <test-token>"
# Expected: User profile data
```

### Step 3: Monitor Key Metrics
```bash
# Check platform availability
curl -s "http://prometheus-server.monitoring:80/api/v1/query?query=sli:platform_availability:rate5m" | \
  jq -r '.data.result[0].value[1]'
# Expected: > 0.99

# Check error rate
curl -s "http://prometheus-server.monitoring:80/api/v1/query?query=rate(http_requests_total{code=~\"5..\"}[5m])" | \
  jq -r '.data.result[0].value[1]'
# Expected: < 0.01
```

### Step 4: End-to-End User Journey Test
```bash
# Run automated E2E tests
npm run test:e2e:critical

# Or manual verification:
# 1. Login to platform
# 2. Upload a test video
# 3. Verify video processing starts
# 4. Check analytics generation
```

## 🧹 **Post-Resolution Tasks**

### Immediate Tasks (Within 30 minutes)
- [ ] Update incident status in PagerDuty
- [ ] Notify stakeholders of resolution
- [ ] Update status page
- [ ] Document root cause (preliminary)

### Short-term Tasks (Within 24 hours)
- [ ] Complete detailed incident analysis
- [ ] Update monitoring/alerting if needed
- [ ] Review and update runbook
- [ ] Schedule post-incident review meeting

### Follow-up Tasks (Within 1 week)
- [ ] Implement preventive measures
- [ ] Update documentation
- [ ] Conduct team retrospective
- [ ] Update disaster recovery procedures

## 📊 **Monitoring Verification**

### Key Dashboards to Check
1. **[Platform Overview](https://grafana.footanalytics.com/d/platform-overview)**
   - Platform availability > 99.9%
   - Error rate < 1%
   - Response time P95 < 200ms

2. **[Infrastructure Dashboard](https://grafana.footanalytics.com/d/infrastructure)**
   - All nodes healthy
   - Resource utilization normal
   - No pod restart loops

3. **[Business Metrics](https://grafana.footanalytics.com/d/business-metrics)**
   - User sessions resuming
   - Video uploads functioning
   - Analytics generation active

### Alert Silence Management
```bash
# Silence related alerts during resolution
amtool silence add alertname="PlatformAvailabilityCritical" \
  --duration="30m" \
  --comment="Platform outage resolution in progress"

# Remove silences after resolution
amtool silence expire <silence-id>
```

## 🚨 **Escalation Procedures**

### When to Escalate
- Resolution time > 15 minutes
- Multiple failed resolution attempts
- Requires infrastructure changes
- Potential data loss identified
- External vendor involvement needed

### Escalation Contacts
1. **Tech Lead**: @tech-lead (Slack), +1-XXX-XXX-XXXX
2. **Engineering Manager**: @eng-manager (Slack), +1-XXX-XXX-XXXX
3. **CTO**: @cto (Slack), +1-XXX-XXX-XXXX

### Escalation Actions
```bash
# Create war room
/incident escalate INC-123 "Platform outage - need additional resources"

# Notify executive team
/notify exec-team "Critical platform outage - ETA for resolution: 30 minutes"

# Engage external support
# - AWS Support (if infrastructure related)
# - Vendor support (if third-party service related)
```

## 📝 **Communication Templates**

### Initial Incident Notification
```
🚨 INCIDENT ALERT 🚨

Incident ID: INC-123
Severity: Critical
Status: Investigating

Issue: Platform outage - API Gateway unavailable
Impact: Users cannot access the platform
ETA: Investigating - updates every 15 minutes

Incident Commander: @platform-engineer
War Room: #incident-123

Next update: 15:30 UTC
```

### Resolution Notification
```
✅ INCIDENT RESOLVED ✅

Incident ID: INC-123
Duration: 23 minutes
Root Cause: Database connection pool exhaustion

Resolution: Restarted database pods and increased connection pool size
Impact: Platform fully restored, all services operational

Post-incident review scheduled for tomorrow 10:00 UTC
```

---

**Last Updated**: 2024-01-15  
**Version**: 1.2.0  
**Tested**: 2024-01-10  
**Next Review**: 2024-02-15
