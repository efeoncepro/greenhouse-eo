# HubSpot email and sequence API routing

> Verified against official HubSpot documentation on 2026-07-19. Reverify eligibility, scopes and limits
> before implementation because packaging and versioned APIs change.

## Choose the correct rail

| Need | Supported rail | Do not assume |
|---|---|---|
| Regular marketing campaign in Marketing Hub Starter | Send/schedule in HubSpot UI | Starter can publish or send it through the Marketing Email API |
| Follow-up after a genuine form submission in Starter | Forms Submission API → form simple workflow → automated marketing email | A form submission is a generic email relay |
| Arbitrary marketing email from an external event | Single-Send API with eligible Enterprise/add-on packaging | Marketing Starter grants direct sending |
| One sales email with human review | HubSpot composer or UI extension `SEND_EMAIL` | `SEND_EMAIL` sends headlessly; it only opens the composer |
| Record an email sent elsewhere | CRM Email Activities API | Creating an activity sends the message |
| Sales outreach from an external app with Sales Hub Professional | Sequences API enrollment | The public API creates or edits sequence content |

## Marketing Hub Starter

Treat direct API sending as unavailable. The Marketing Email API can manage email assets, but its documented
`/publish` and `/unpublish` operations require Marketing Hub Enterprise or the Transactional Email Add-On.
Single-Send likewise requires eligible Enterprise/add-on packaging. The Transactional Email Add-On is sold
only for Marketing Hub Professional and Enterprise.

Starter has one narrow supported indirect path:

1. Create a HubSpot form and configure its simple workflow to send an automated marketing email.
2. Submit a real conversion to
   `POST https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`.
3. Include the actual fields and applicable `legalConsentOptions`.
4. Ensure the contact is a marketing contact and eligible for the subscription type.
5. Read back workflow enrollment and the delivered/suppressed outcome.

Use this only when the event truthfully represents that form submission, such as a content download, demo
request or registration. Never create fake submissions to turn a form into a relay: this corrupts attribution
and can misrepresent consent. Marketing Hub Starter permits one simple workflow per form with up to 10 actions.

## Sales Hub Professional

### One-to-one sales email

HubSpot does not document a public endpoint that directly sends an arbitrary one-to-one sales email. CRM Email
Activities creates/reads timeline records; it is not a transport. A CRM UI extension's `SEND_EMAIL` action opens
a composer with optional prefilled subject/body and still requires a user to send.

For API-triggered sales outreach, enroll in a sequence. A one-email sequence is the native approximation of a
single programmatic sales email while preserving connected-inbox, sender and sequence controls.

### Sequence enrollment API

Create, review and share the sequence in HubSpot first. The documented API surface lists/gets sequences,
enrolls one contact and reads contact enrollment status.

```http
POST /automation/sequences/2026-03/enrollments?userId={HUBSPOT_USER_ID}
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

```json
{
  "sequenceId": "123456",
  "contactId": "987654",
  "senderEmail": "seller@example.com"
}
```

Required scopes: `automation.sequences.read` and `automation.sequences.enrollments.write`.

Before enrolling, verify:

- the `userId` has an assigned eligible Sales/Service Professional or Enterprise seat;
- the user has Sequences permission, a connected personal inbox and access to the sequence;
- `senderEmail` is connected, and the contact has a valid non-bounced address;
- the contact is not already enrolled in another sequence;
- outreach has a lawful basis, respects opt-out/suppression and is not disguised bulk marketing;
- the caller reads enrollment status before retrying and handles idempotency.

Sales Hub Professional permits up to 500 sequence sends per assigned user over a rolling 24-hour window. Bulk
enrollments are additionally limited to three email sends per minute. A lower custom or provider limit binds first.

## Routing decision

- Form confirmation on Starter: use form automation.
- Newsletter or segment blast: use Marketing Hub, never a sales sequence.
- Relationship/system message from an app: use eligible transactional email or an external provider.
- Personalized seller cadence on Sales Hub Professional: use Sequences API enrollment.
- Seller message requiring review: open the composer and preserve human confirmation.

## Official sources

- [Marketing Email API](https://developers.hubspot.com/docs/api-reference/latest/marketing/marketing-emails/guide)
- [Transactional and Single-Send API](https://developers.hubspot.com/docs/api-reference/latest/marketing/transactional-emails/guide)
- [Product & Services Catalog](https://legal.hubspot.com/hubspot-product-and-services-catalog)
- [Form automation](https://knowledge.hubspot.com/forms/form-automations)
- [Forms Submission API](https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-unauthenticated)
- [Sequences API](https://developers.hubspot.com/docs/api-reference/latest/automation/sequences/guide)
- [Sequence enrollment endpoint](https://developers.hubspot.com/docs/api-reference/latest/automation/sequences/enroll-contact)
- [Sequence enrollment requirements](https://knowledge.hubspot.com/sequences/enroll-contacts-in-a-sequence)
- [Connected inbox sending limits](https://knowledge.hubspot.com/connected-email/sales-email-send-limits)
- [CRM Email Activities](https://developers.hubspot.com/docs/api-reference/latest/crm/activities/emails/guide)
- [CRM `SEND_EMAIL` action](https://developers.hubspot.com/docs/apps/developer-platform/add-features/ui-extensions/ui-components/crm-action-components/overview)
