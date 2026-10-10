# Listing inventory to partner context

The Monday postcard pipeline keeps its existing criteria, print approvals and send behavior. This separate bridge reads already collected inventory and links property/person observations to the CRM, including properties that did not qualify for postcards. It never initiates a scrape, research API call, print job or message.

Run `node scripts/refresh-partner-listing-inventory.cjs` to preview. Add `--apply` to save internal links, research candidates and paused source-backed new contacts. Set `PARTNER_EVENT_LOOKBACK_DAYS` (1–90, default 14) and `PARTNER_EVENT_REPORT` to control the observation window and audit artifact. Reads use the existing region/status/zpid index. Research state/results are preserved while the current listing payload is refreshed. Missing attribution goes to the existing research queue; it is not proof the address has no agent.

The dedicated workflow runs after successful main-branch inventory/postcard runs and supports manual preview. It does not change the Monday scrape schedule. Failed/interrupted writes can be replayed using stable property/representative keys; retained printer references must not be erased by a non-print inventory refresh.

Identity: exact normalized person name plus one unique direct phone/email can match an existing contact. Shared identifiers, conflicting identifiers, and name/brokerage-only matches require review. No matching identity plus a source-backed listing/seller role and a direct contact method can create a paused discovery. Source research findings remain reviewable. Human-reviewed links are preserved. No discovery joins an outreach sequence.

Inferred sale means disappearance, not confirmed sale. Latest observation is not the transaction date. Repeated inventory snapshots are not new property events. The CRM Partner Event Desk groups properties by person and reads Sales/Partnership calls, messages, card evidence and commitments before suggesting any approach. This release is connection/planning only; event-based outreach remains off.

Other categories and event sources can use the CRM's normalized MarketEvent/planPartnerEvents interface. Open-house/industry-event connectors are not part of this listing bridge.
