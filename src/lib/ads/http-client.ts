import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

export class AdsHttpClient {
    private client: AxiosInstance

    constructor(baseURL?: string) {
        this.client = axios.create({
            baseURL,
            timeout: 30000, // 30 seconds
        })
    }

    /**
     * Executes a request with automatic retry and exponential backoff for 429 and 5xx errors.
     */
    async request<T>(config: AxiosRequestConfig, attempt: number = 0): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.client.request(config)
            return response.data
        } catch (error: any) {
            const axiosError = error as AxiosError
            const status = axiosError.response?.status

            const shouldRetry = (status === 429 || (status && status >= 500)) && attempt < MAX_RETRIES

            if (shouldRetry) {
                const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
                console.warn(`[AdsHttpClient] Request failed with status ${status}. Retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`)
                await new Promise(resolve => setTimeout(resolve, backoff))
                return this.request(config, attempt + 1)
            }

            // Clean error for logging (don't log sensitive config headers)
            const cleanError = {
                message: axiosError.message,
                status: axiosError.response?.status,
                data: axiosError.response?.data,
                url: axiosError.config?.url,
                method: axiosError.config?.method,
            }

            console.error('[AdsHttpClient] Request fatal error:', JSON.stringify(cleanError))
            throw new Error(this.humanizeError(axiosError))
        }
    }

    private humanizeError(error: AxiosError): string {
        const data: any = error.response?.data
        if (data?.error) {
            // Meta: prefer user-friendly message, then fallback to technical message
            const detail = data.error.error_user_msg || data.error.error_user_title
            if (detail) return detail
            return data.error.message
        }
        if (data?.error_description) return data.error_description // Generic OAuth
        if (data?.message) return data.message // TikTok / General
        return error.message
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.request<T>({ ...config, method: 'GET', url })
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.request<T>({ ...config, method: 'POST', url, data })
    }
}
