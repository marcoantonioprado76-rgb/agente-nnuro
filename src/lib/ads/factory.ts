import { AdPlatform } from '@prisma/client'
import { IAdsAdapter } from './types'
import { MetaAdapter } from './adapters/meta'
import { GoogleAdsAdapter } from './adapters/google'
import { TikTokAdapter } from './adapters/tiktok'

export class AdapterFactory {
    static getAdapter(platform: AdPlatform): IAdsAdapter {
        switch (platform) {
            case AdPlatform.META:
                return new MetaAdapter()
            case AdPlatform.GOOGLE_ADS:
                return new GoogleAdsAdapter()
            case AdPlatform.TIKTOK:
                return new TikTokAdapter()
            default:
                throw new Error(`Platform ${platform} not supported`)
        }
    }
}
