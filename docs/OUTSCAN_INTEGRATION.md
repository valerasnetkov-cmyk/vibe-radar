# OUTSCAN Integration — Vibe Radar

## 1. Status

Planned, disabled by default.

Canonical OUTSCAN domain: `outscan.ru`.

Vibe Radar must remain a complete standalone media/discovery product without OUTSCAN.

## 2. Why the integration fits

Vibe Radar audience overlaps strongly with AI builders, indie developers, freelancers, studios, self-hosters, and people who rapidly deploy public projects. OUTSCAN can be relevant after deployment as an independent external-risk/security posture product.

## 3. Editorial independence

OUTSCAN is forbidden from influencing:

- discovery;
- VIBE SCORE;
- candidate threshold;
- editorial priority;
- sponsored ranking.

Monetization/integration cannot buy a better score.

## 4. Relevance enum

Content analysis may suggest one of:

- `NONE`
- `SOFT_CTA`
- `DEPLOY_CTA`
- `OUTSCAN_CHECK`

This is contextual metadata only.

## 5. Feature flags

Required defaults:

```text
OUTSCAN_INTEGRATION_ENABLED=false
OUTSCAN_NATIVE_CTA_ENABLED=false
OUTSCAN_CHECK_ENABLED=false
```

A model cannot modify flags.

## 6. Native integration examples

Suitable contexts:

- deployment tooling;
- hosting/VPS/cloud;
- self-hosted web applications;
- AI website/app builders;
- coding agents that produce public deployments;
- SaaS launch workflows.

Unsuitable context:

- a local-only library with no meaningful deployment/security connection.

## 7. Native CTA principle

The CTA should extend the editorial context rather than interrupt it.

Example concept:

```text
After deploy
Fast deployment is only one part of the workflow. A separate external check can show what is actually exposed from the Internet. OUTSCAN → check your domain.
```

Final public wording must use only approved OUTSCAN claims.

## 8. OUTSCAN Check format

Later editorial series:

```text
approved project/deployment
→ explain build/deploy context
→ run an authorized OUTSCAN flow
→ show only permitted result projection
→ fix/change
→ recheck
```

Do not automatically scan arbitrary third-party projects merely because Vibe Radar discovered their GitHub repository.

For public project/user submissions, obtain the required authorization/consent and follow OUTSCAN's own scan authorization model.

## 9. Attribution

Planned funnel:

```text
Vibe Radar publication
→ OUTSCAN CTA/campaign
→ Guest Scan
→ registration
→ verification
→ monitoring
→ paid conversion
```

Store campaign/content attribution separately from VIBE SCORE.

Useful fields later:

- `viberadar_publication_id`
- `outscan_campaign_id`
- `outscan_cta_variant`

## 10. Release gate

Do not enable public integration until the corresponding OUTSCAN capability is actually available and approved for public claims/use. Vibe Radar documentation may prepare the integration contract without implying that OUTSCAN capabilities are already live.
