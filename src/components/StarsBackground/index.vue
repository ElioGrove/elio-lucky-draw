<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import Sparticles from 'sparticles'
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import ImageSync from '@/components/ImageSync/index.vue'

interface SparticlesInstance {
  destroy: () => void
  setCanvasSize: (width: number, height: number) => void
}

const props = defineProps({
  homeBackground: {
    type: Object,
    default: () => ({
      id: '',
      name: '',
      url: '',
    }),
  },
})

const starRef = ref<HTMLElement | null>(null)
const sparticles = shallowRef<SparticlesInstance | null>(null)
const { width, height } = useElementSize(starRef)

const sparticlesOptions = {
  shape: 'star',
  parallax: 1.2,
  rotate: true,
  twinkle: true,
  speed: 10,
  count: 200,
}

function addSparticles(node: HTMLElement, width: number, height: number) {
  sparticles.value?.destroy()
  sparticles.value = new Sparticles(node, sparticlesOptions, width, height)
}

function handleResize() {
  if (!starRef.value) {
    return
  }
  if (width.value && height.value) {
    sparticles.value?.setCanvasSize(width.value, height.value)
  }
}

onMounted(() => {
  if (starRef.value) {
    addSparticles(starRef.value, width.value, height.value)
  }
})
watch([width, height], handleResize)

onUnmounted(() => {
  sparticles.value?.destroy()
  sparticles.value = null
})
</script>

<template>
  <div v-if="homeBackground.url" class="home-background w-screen h-screen overflow-hidden">
    <ImageSync :img-item="props.homeBackground" class="w-full h-full !rounded-none" alt="" />
  </div>
  <div v-else ref="starRef" class="w-screen h-screen overflow-hidden" />
</template>

<style lang="scss" scoped>
</style>
