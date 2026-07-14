# Meta Ads Setup & Test Guide (PRO)

This guide explains how to configure and verify the real Meta Ads integration.

## 1. Meta App Configuration
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create a "Business" type App.
3. Add the **Marketing API** product.
4. Add the **Facebook Login for Business** product.
5. In **Settings > Basic**, get your `App ID` and `App Secret`.
6. In **Product > Facebook Login for Business > Settings**, add your `Redirect URI`:
   `https://[YOUR_DOMAIN]/api/ads/integrations/meta/connect/callback`
7. Ensure your App is in **Live Mode** (requires Business Verification for production scopes).

## 2. Environment Variables (.env)
```env
# Meta Ads
META_APP_ID=your_id
META_APP_SECRET=your_secret
META_REDIRECT_URI=https://your-domain.com/api/ads/integrations/meta/connect/callback
ADS_ENCRYPTION_KEY=32_character_base64_key
BASE_URL=https://your-domain.com
```

## 3. Scopes Needed
The integration requests:
- `ads_management`
- `ads_read`
- `business_management`
- `public_profile`

## 4. E2E Verification Checklist
1. **Connect**: Go to `/dashboard/services/ads`, click "Conectar Plataforma" for Meta.
2. **Authorize**: Complete the Facebook OAuth flow.
3. **Select Account**: The UI should now list your Ad Accounts. Select one.
4. **Draft**: Create a new Ad Draft.
5. **Publish**: Click "Publicar".
   - This creates an `AdJob` in the database.
   - The `AdsWorker` picks it up.
   - A real Campaign, AdSet, Creative, and Ad are created as **PAUSED**.
6. **Verify Remote**: Open [Meta Ads Manager](https://adsmanager.facebook.com/).
   - You should see the new campaign with the matching IDs.
7. **Pause/Resume**: Use the dashboard buttons to toggle status and verify in Ads Manager.
8. **Metrics**: Wait 60 mins or manually trigger `AdsService.syncAllMetrics()` and check the `AdMetricsDaily` table.

## 5. Security & Idempotency
- Tokens are encrypted with AES-256-GCM.
- `publishCampaign` checks for existing `AdRemoteMapping` before calling the API to prevent double-spending/duplication.
- Failed jobs are retried up to 3 times with exponential backoff.
