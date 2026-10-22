import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/locales/i18n'
import ImageConfig from './ImageConfig.vue'
import MusicConfig from './MusicConfig.vue'

const { read, save } = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }))
vi.mock('@/utils/file', () => ({ readFileData: read }))
vi.mock('localforage', () => ({ default: { createInstance: () => ({ keys: async () => [], setItem: save }) } }))

afterEach(() => vi.clearAllMocks())
describe.each([
  { name: 'image', component: ImageConfig, selector: '#image-upload', type: 'image/png' },
  { name: 'audio', component: MusicConfig, selector: '#music-upload', type: 'audio/mpeg' },
])('$name upload locking', ({ component, selector, type }) => {
  it('locks before reading the file and prevents overlapping uploads', async () => {
    let finish!: (data: { dataUrl: string, fileName: string }) => void
    read.mockReturnValue(new Promise(resolve => finish = resolve))
    setActivePinia(createPinia())
    const wrapper = mount(component, { global: { plugins: [i18n], stubs: { ImageSync: true, ConfirmDialog: true } } })
    try {
      await flushPromises()
      const input = wrapper.get<HTMLInputElement>(selector).element
      Object.defineProperty(input, 'files', { value: [new File(['test'], 'upload', { type })] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushPromises()
      expect(input.disabled).toBe(true)
      expect(read).toHaveBeenCalledTimes(1)
      expect(save).not.toHaveBeenCalled()
      finish({ dataUrl: `data:${type};base64,dGVzdA==`, fileName: 'upload' })
      await flushPromises()
      expect(save).toHaveBeenCalledTimes(1)
      expect(input.disabled).toBe(false)
    }
    finally { wrapper.unmount() }
  })
})
