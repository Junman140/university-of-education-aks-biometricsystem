# Pilot playbook (MVP)

## Roles

- **Registrar / ICT**: owns enrollment windows, device allocation, escalation policy.
- **Enrollment staff**: identity checks + fingerprint capture.
- **Invigilators**: 1:1 verification at hall entry.
- **Data protection officer**: consent, retention, NDPR documentation.

## Fallback protocol (exam day)

1. **Scanner fault**: switch to spare device or move student to backup lane; log incident.
2. **Network outage**: hall node continues with cached roster + local verification; queue events for sync.
3. **Finger injury / poor quality**: manual identity check (ID + photo) per institutional policy; record override in audit log (future enhancement: explicit override reason field).
4. **Disputed match**: secondary capture; if still failing, escalate to chief invigilator; never block without documented escalation path.

## Enrollment throughput

- Target **2–4 minutes per student** including document check (varies with staffing).
- Run parallel desks during peak (registration week).
- Require **minimum quality score** before accepting enrollment; reject and recapture immediately.

## Monitoring

- API `/health`, matching service `/health`, hall node `/api/health`.
- Track: verification counts, `no_match` rate per hall, device `lastSeenAt`.
- Alert if `no_match` rate spikes (may indicate hardware drift or wrong roster).

## NDPR & consent (summary — not legal advice)

- Publish purpose, lawful basis, retention, and who can access biometric data.
- Obtain **informed consent** at enrollment; allow withdrawal per policy.
- Store **templates only** (not long-term raw images); encrypt at rest; restrict admin roles.
- Define retention: e.g. delete templates after graduation + N years unless legal hold.

## Pilot checklist

- [ ] MongoDB backups configured (or Atlas backup policy)
- [ ] `TEMPLATE_ENCRYPTION_KEY` (64 hex chars) set consistently on API + hall nodes
- [ ] Matching service reachable from API and hall nodes
- [ ] At least one exam roster loaded and hall sync tested offline
- [ ] Staff training on fallback protocol completed
