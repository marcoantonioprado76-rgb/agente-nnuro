export type UserPlan = 'NONE' | 'BASIC' | 'PRO' | 'ELITE'

export const PLAN_LIMITS = {
    NONE: {
        bots: 0,
        productsPerUser: 0,
        stores: 0,
        landingPages: 0,
        ads: false,
        adsPerMonth: 0,
        newLaunches: false,
        clipping: true,
    },
    BASIC: {
        bots: 2,
        productsPerUser: 2,
        stores: 1,
        landingPages: 1,
        ads: true,
        adsPerMonth: 5,
        newLaunches: false,
        clipping: true,
    },
    PRO: {
        bots: 4,
        productsPerUser: 20,
        stores: 2,
        landingPages: 3,
        ads: true,
        adsPerMonth: 15,
        newLaunches: false,
        clipping: true,
    },
    ELITE: {
        bots: 8,
        productsPerUser: 40,
        stores: 5,
        landingPages: 6,
        ads: true,
        adsPerMonth: 30,
        newLaunches: true,
        clipping: true,
    },
} as const

export const PLAN_NAMES: Record<UserPlan, string> = {
    NONE: 'Sin Plan',
    BASIC: 'Pack Básico',
    PRO: 'Pack Pro',
    ELITE: 'Pack Elite',
}

export function getPlanLimits(plan: UserPlan) {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.NONE
}
